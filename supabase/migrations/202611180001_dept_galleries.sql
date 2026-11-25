begin;
-- Additive migration. Existing screening Auth, profiles, policies and content stay intact.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema dept_gallery_private;
revoke all on schema dept_gallery_private from public, anon, authenticated;

create table public.gallery_admin_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.gallery_admin_roles enable row level security;
revoke all on public.gallery_admin_roles from public, anon, authenticated;
-- No self-service grant endpoint. Existing active studio admins retain their authority.
create function public.is_gallery_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active
 and (p.role='admin' or exists(select 1 from public.gallery_admin_roles r where r.user_id=p.id)));
$$;
revoke all on function public.is_gallery_admin() from public;
grant execute on function public.is_gallery_admin() to authenticated;

create table public.dept_galleries (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(length(slug) between 1 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check(length(btrim(title)) between 1 and 120),
 description text not null default '' check(length(description)<=10000),
 category text not null default 'PHOTOGRAPHY' check(length(category)<=100),
 cover_photo_id uuid,
 visibility text not null default 'private' check(visibility in ('public','private')),
 status text not null default 'draft' check(status in ('draft','published','expired')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 expires_at timestamptz, sort_order integer not null default 0, revision integer not null default 1
);
create index dept_galleries_directory on public.dept_galleries(sort_order,created_at) where visibility='public' and status='published';
create table public.dept_gallery_photos (
 id uuid primary key default gen_random_uuid(), gallery_id uuid not null references public.dept_galleries(id) on delete cascade,
 filename text not null check(length(filename) between 1 and 255),
 original_object_key text not null unique, preview_object_key text not null unique,
 width integer not null check(width>0), height integer not null check(height>0),
 original_file_size bigint not null check(original_file_size>0),
 content_type text not null check(content_type in ('image/jpeg','image/png','image/webp','image/tiff','image/heic','image/avif')),
 sort_order integer not null default 0, created_at timestamptz not null default now(),
 unique(gallery_id,id)
);
create index dept_gallery_photos_order on public.dept_gallery_photos(gallery_id,sort_order,id);
alter table public.dept_galleries add constraint dept_gallery_cover_belongs
 foreign key(id,cover_photo_id) references public.dept_gallery_photos(gallery_id,id) deferrable initially deferred;
create table dept_gallery_private.passwords (
 gallery_id uuid primary key references public.dept_galleries(id) on delete cascade,
 password_hash text not null, updated_at timestamptz not null default now()
);
create table dept_gallery_private.access_sessions (
 token_hash text primary key, gallery_id uuid not null references public.dept_galleries(id) on delete cascade,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index gallery_sessions_expiry on dept_gallery_private.access_sessions(expires_at);
create index gallery_sessions_gallery on dept_gallery_private.access_sessions(gallery_id);
-- Bounded fixed-bucket limiter also covers nonexistent slugs, without a row per arbitrary slug.
create table dept_gallery_private.access_limits (
 bucket integer primary key, window_start timestamptz not null, attempts integer not null
);
create table dept_gallery_private.storage_deletions (
 id bigint generated always as identity primary key, original_object_key text not null,
 preview_object_key text not null, created_at timestamptz not null default now()
);
alter table dept_gallery_private.passwords enable row level security;
alter table dept_gallery_private.access_sessions enable row level security;
alter table dept_gallery_private.access_limits enable row level security;
alter table dept_gallery_private.storage_deletions enable row level security;
revoke all on all tables in schema dept_gallery_private from public,anon,authenticated;
alter table public.dept_galleries enable row level security;
alter table public.dept_gallery_photos enable row level security;
revoke all on public.dept_galleries, public.dept_gallery_photos from public,anon,authenticated;
grant select on public.dept_galleries to anon,authenticated;
grant select on public.dept_gallery_photos to authenticated;
create policy gallery_public_read on public.dept_galleries for select to anon,authenticated
 using(visibility='public' and status='published' and (expires_at is null or expires_at>now()));
create policy gallery_admin_read on public.dept_galleries for select to authenticated using(public.is_gallery_admin());
create policy gallery_photo_admin_read on public.dept_gallery_photos for select to authenticated using(public.is_gallery_admin());
-- Mutations only via role-checked RPCs; no client INSERT/UPDATE/DELETE grants.
create function dept_gallery_private.changed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.revision=old.revision+1; new.updated_at=now();
 if new.visibility<>old.visibility or new.status<>old.status or new.expires_at is distinct from old.expires_at or new.slug<>old.slug then
 delete from dept_gallery_private.access_sessions where gallery_id=new.id;
 end if;
 return new;
end;$$;
create trigger gallery_changed before update on public.dept_galleries for each row execute function dept_gallery_private.changed();
create function dept_gallery_private.photo_removed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.dept_galleries set cover_photo_id=null where id=old.gallery_id and cover_photo_id=old.id;
 insert into dept_gallery_private.storage_deletions(original_object_key,preview_object_key) values(old.original_object_key,old.preview_object_key);
 return old;
end;$$;
create trigger gallery_photo_removed before delete on public.dept_gallery_photos for each row execute function dept_gallery_private.photo_removed();

create function public.gallery_admin_list() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(g)||jsonb_build_object('passwordConfigured',exists(select 1 from dept_gallery_private.passwords p where p.gallery_id=g.id),'photos',coalesce((select jsonb_agg(to_jsonb(p) - 'original_object_key' - 'preview_object_key' order by p.sort_order,p.id) from public.dept_gallery_photos p where p.gallery_id=g.id),'[]'::jsonb)) order by g.sort_order,g.created_at) from public.dept_galleries g),'[]'::jsonb);
end;$$;
create function public.gallery_save(p_gallery jsonb, p_password text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid; old public.dept_galleries; vis text; stat text;
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 gid=coalesce(nullif(p_gallery->>'id','')::uuid,gen_random_uuid());
 select * into old from public.dept_galleries where id=gid for update;
 if found and old.revision<>coalesce((p_gallery->>'revision')::integer,-1) then raise exception 'Collection changed elsewhere. Refresh before saving.'; end if;
 vis=coalesce(p_gallery->>'visibility','private'); stat=coalesce(p_gallery->>'status','draft');
 if p_password is not null and (octet_length(p_password)<12 or octet_length(p_password)>72) then raise exception 'Use a gallery password of 12 to 72 UTF-8 bytes.'; end if;
 if vis='private' and stat='published' and p_password is null and not exists(select 1 from dept_gallery_private.passwords where gallery_id=gid) then raise exception 'Set a password before publishing a private gallery.'; end if;
 insert into public.dept_galleries(id,slug,title,description,category,visibility,status,expires_at,sort_order,cover_photo_id)
 values(gid,p_gallery->>'slug',btrim(p_gallery->>'title'),coalesce(p_gallery->>'description',''),coalesce(p_gallery->>'category','PHOTOGRAPHY'),vis,stat,nullif(p_gallery->>'expires_at','')::timestamptz,coalesce((p_gallery->>'sort_order')::integer,0),nullif(p_gallery->>'cover_photo_id','')::uuid)
 on conflict(id) do update set slug=excluded.slug,title=excluded.title,description=excluded.description,category=excluded.category,visibility=excluded.visibility,status=excluded.status,expires_at=excluded.expires_at,sort_order=excluded.sort_order,cover_photo_id=excluded.cover_photo_id;
 if p_password is not null then
 insert into dept_gallery_private.passwords(gallery_id,password_hash) values(gid,extensions.crypt(p_password,extensions.gen_salt('bf',12)))
 on conflict(gallery_id) do update set password_hash=excluded.password_hash,updated_at=now();
 delete from dept_gallery_private.access_sessions where gallery_id=gid;
 end if;
 return gid;
end;$$;
create function public.gallery_delete(p_id uuid,p_revision integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 perform 1 from public.dept_galleries where id=p_id and revision=p_revision for update;
 if not found then raise exception 'Collection changed or no longer exists. Refresh first.'; end if;
 -- Remove the cover link first; photo deletion is deferred and queued for Phase 3 storage cleanup.
 update public.dept_galleries set cover_photo_id=null where id=p_id;
 delete from public.dept_galleries where id=p_id;
end;$$;
create function public.gallery_photo_manage(p_gallery_id uuid,p_revision integer,p_order uuid[] default null,p_delete uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_gallery_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 perform 1 from public.dept_galleries where id=p_gallery_id and revision=p_revision for update;
 if not found then raise exception 'Collection changed. Refresh first.'; end if;
 if p_delete is not null then
 delete from public.dept_gallery_photos where id=p_delete and gallery_id=p_gallery_id;
 if not found then raise exception 'Photo not found'; end if;
 elsif p_order is not null then
 if cardinality(p_order)<>(select count(*) from public.dept_gallery_photos where gallery_id=p_gallery_id)
 or cardinality(p_order)<>(select count(distinct x) from unnest(p_order) x)
 or exists(select 1 from unnest(p_order) x where not exists(select 1 from public.dept_gallery_photos p where p.id=x and p.gallery_id=p_gallery_id)) then raise exception 'Order must contain each gallery photo exactly once'; end if;
 update public.dept_gallery_photos p set sort_order=o.n-1 from unnest(p_order) with ordinality o(id,n) where p.id=o.id and p.gallery_id=p_gallery_id;
 else raise exception 'Photo action required'; end if;
 update public.dept_galleries set updated_at=now() where id=p_gallery_id;
end;$$;
-- Authorized DTO intentionally contains NO storage keys or URLs. Phase 3 will sign previews.
create function dept_gallery_private.presentation(gid uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',g.id,'slug',g.slug,'title',g.title,'description',g.description,'category',g.category,'cover',null,'photos','[]'::jsonb,'photo_count',(select count(*) from public.dept_gallery_photos p where p.gallery_id=g.id),'sample',false) from public.dept_galleries g where g.id=gid;
$$;
create function public.gallery_directory() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(dept_gallery_private.presentation(g.id) order by g.sort_order,g.created_at),'[]'::jsonb) from public.dept_galleries g
 where visibility='public' and status='published' and (expires_at is null or expires_at>now());
$$;
create function public.gallery_resolve(p_slug text,p_token text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.dept_galleries;
begin
 select * into g from public.dept_galleries where slug=p_slug and status='published' and (expires_at is null or expires_at>now());
 if not found then return jsonb_build_object('state','locked'); end if;
 if g.visibility='public' then return jsonb_build_object('state','public','gallery',dept_gallery_private.presentation(g.id)); end if;
 if p_token is not null and length(p_token)=64 and exists(select 1 from dept_gallery_private.access_sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and gallery_id=g.id and expires_at>now()) then
 return jsonb_build_object('state','authorized','gallery',dept_gallery_private.presentation(g.id)); end if;
 return jsonb_build_object('state','locked');
end;$$;
create function public.gallery_unlock(p_slug text,p_password text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.dept_galleries; hash text; token text; bucket_id integer; n integer; until_time timestamptz;
begin
 if p_slug is null or length(p_slug)>100 or p_password is null or octet_length(p_password)>72 then return jsonb_build_object('state','invalid'); end if;
 -- Hash collisions deliberately share a budget. One row per bucket, atomic updates serialize attempts.
 bucket_id=(hashtextextended(p_slug,0)&4095)::integer;
 insert into dept_gallery_private.access_limits(bucket,window_start,attempts) values(bucket_id,now(),1)
 on conflict(bucket) do update set attempts=case when dept_gallery_private.access_limits.window_start<now()-interval '15 minutes' then 1 else dept_gallery_private.access_limits.attempts+1 end,
 window_start=case when dept_gallery_private.access_limits.window_start<now()-interval '15 minutes' then now() else dept_gallery_private.access_limits.window_start end returning attempts into n;
 if n>10 then return jsonb_build_object('state','rate-limited'); end if;
 select * into g from public.dept_galleries where slug=p_slug for update;
 select password_hash into hash from dept_gallery_private.passwords where gallery_id=g.id;
 if hash is null or extensions.crypt(p_password,hash)<>hash then return jsonb_build_object('state','invalid'); end if;
 if g.status<>'published' or g.visibility<>'private' or (g.expires_at is not null and g.expires_at<=now()) then return jsonb_build_object('state','expired'); end if;
 token=encode(extensions.gen_random_bytes(32),'hex'); until_time=least(now()+interval '15 minutes',coalesce(g.expires_at,now()+interval '15 minutes'));
 delete from dept_gallery_private.access_sessions where expires_at<=now();
 insert into dept_gallery_private.access_sessions(token_hash,gallery_id,expires_at) values(encode(extensions.digest(token,'sha256'),'hex'),g.id,until_time);
 return jsonb_build_object('state','unlocked','token',token,'expires_at',until_time,'gallery',dept_gallery_private.presentation(g.id));
end;$$;
create function public.gallery_lock(p_token text) returns void language sql security definer set search_path='' as $$
 delete from dept_gallery_private.access_sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
$$;
revoke all on all functions in schema dept_gallery_private from public,anon,authenticated;
revoke all on function public.gallery_admin_list(),public.gallery_save(jsonb,text),public.gallery_delete(uuid,integer),public.gallery_photo_manage(uuid,integer,uuid[],uuid),public.gallery_directory(),public.gallery_resolve(text,text),public.gallery_unlock(text,text),public.gallery_lock(text) from public,anon,authenticated;
grant execute on function public.gallery_admin_list(),public.gallery_save(jsonb,text),public.gallery_delete(uuid,integer),public.gallery_photo_manage(uuid,integer,uuid[],uuid) to authenticated;
grant execute on function public.gallery_directory(),public.gallery_resolve(text,text),public.gallery_unlock(text,text),public.gallery_lock(text) to anon,authenticated;
commit;
