begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null, display_name text not null default 'Guest',
 role text not null default 'viewer' check(role in ('admin','viewer')),
 is_active boolean not null default true, created_at timestamptz not null default now()
);
create function public.is_member() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and is_active);
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and is_active and role='admin');
$$;
revoke all on function public.is_member(), public.is_admin() from public;
grant execute on function public.is_member(), public.is_admin() to authenticated;
create function public.invited_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.invited_at is null then raise exception 'Invitation required'; end if;
 insert into public.profiles(id,email,display_name) values(new.id,new.email,split_part(new.email,'@',1));
 return new;
end; $$;
create trigger on_invited_user after insert on auth.users for each row execute function public.invited_profile();
create table public.categories (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 slug text not null unique, sort_order integer not null default 0
);
create table public.projects (
 id uuid primary key default gen_random_uuid(), title text not null,
 description text not null default '', created_at timestamptz not null default now()
);
create table public.videos (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 1 and 200),
 slug text not null unique, description text not null default '', short_description text not null default '',
 youtube_url text not null default '', youtube_video_id text not null default '',
 provider text not null default 'youtube' check(provider in ('youtube','vimeo','mux','cloudflare')),
 provider_video_id text not null, thumbnail_url text not null default '', backdrop_url text not null default '',
 year integer not null check(year between 1888 and 2200), runtime integer not null default 0 check(runtime>=0),
 category_id uuid references public.categories(id) on delete set null,
 content_type text not null default 'other' check(content_type in ('documentary','family','event','short_film','creative','other')),
 status text not null default 'draft' check(status in ('draft','rough_cut','fine_cut','private_preview','final')),
 project_id uuid references public.projects(id) on delete set null,
 version_name text not null default 'Final', version_number integer not null default 1 check(version_number>0),
 is_featured boolean not null default false, is_draft boolean not null default false,
 is_published boolean not null default false, creator text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(project_id,version_number),
 check(provider <> 'youtube' or (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$' and provider_video_id=youtube_video_id))
);
create table public.feedback (
 id uuid primary key default gen_random_uuid(), video_id uuid not null references public.videos(id) on delete cascade,
 user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 author_name text not null default '', comment text not null check(length(trim(comment)) between 1 and 4000),
 timestamp_seconds integer check(timestamp_seconds between 0 and 359999), created_at timestamptz not null default now()
);
create function public.stamp_feedback() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.user_id := auth.uid();
 select display_name into new.author_name from public.profiles where id=auth.uid();
 new.created_at := now();
 return new;
end; $$;
create trigger feedback_author before insert on public.feedback for each row execute function public.stamp_feedback();
create function public.stamp_updated() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
create trigger video_updated before update on public.videos for each row execute function public.stamp_updated();
create index videos_category on public.videos(category_id);
create index videos_project on public.videos(project_id,version_number);
create index videos_library on public.videos(is_published,is_draft,created_at desc);
create index feedback_video on public.feedback(video_id,created_at);
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.projects enable row level security;
alter table public.videos enable row level security;
alter table public.feedback enable row level security;
revoke all on public.profiles,public.categories,public.projects,public.videos,public.feedback from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(is_active) on public.profiles to authenticated;
grant select,insert,update,delete on public.categories,public.projects,public.videos to authenticated;
grant select,insert,delete on public.feedback to authenticated;
create policy profile_read on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy profile_admin_update on public.profiles for update to authenticated using(public.is_admin() and id<>auth.uid()) with check(public.is_admin() and id<>auth.uid());
create policy category_read on public.categories for select to authenticated using(public.is_member());
create policy category_admin on public.categories for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy video_read on public.videos for select to authenticated using(public.is_admin() or (public.is_member() and is_published));
create policy video_admin on public.videos for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy project_read on public.projects for select to authenticated using(public.is_admin() or (public.is_member() and exists(select 1 from public.videos v where v.project_id=projects.id and v.is_published)));
create policy project_admin on public.projects for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy feedback_read on public.feedback for select to authenticated using(public.is_admin() or (public.is_member() and exists(select 1 from public.videos v where v.id=feedback.video_id and v.is_draft and v.is_published)));
create policy feedback_create on public.feedback for insert to authenticated with check(public.is_member() and user_id=auth.uid() and exists(select 1 from public.videos v where v.id=feedback.video_id and v.is_draft and (v.is_published or public.is_admin())));
create policy feedback_delete on public.feedback for delete to authenticated using(public.is_admin() or (public.is_member() and user_id=auth.uid()));
commit;
