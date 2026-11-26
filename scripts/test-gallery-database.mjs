// Isolated PostgreSQL policy/migration tests; NO network or production credentials.
// PGlite does not ship pgcrypto: test-only substitutes exercise control flow, not cryptographic strength.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
const db = new PGlite();
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key);grant usage on schema auth to anon,authenticated;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.profiles(id uuid primary key references auth.users,role text,is_active boolean);
insert into auth.users values('a0000000-0000-4000-8000-000000000001'),('a0000000-0000-4000-8000-000000000002');
insert into public.profiles values('a0000000-0000-4000-8000-000000000001','admin',true),('a0000000-0000-4000-8000-000000000002','viewer',true);
create schema extensions;
create function extensions.gen_salt(text,integer) returns text language sql as $$select '$2$'$$;
create function extensions.crypt(text,text) returns text language sql as $$select '$2$'||md5($1)$$;
create function extensions.digest(text,text) returns bytea language sql as $$select decode(md5($1)||md5($1),'hex')$$;
create function extensions.gen_random_bytes(integer) returns bytea language sql as $$select decode(replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),'hex')$$;
create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));alter table storage.objects enable row level security;
`);
  const phase2 = (
    await readFile("supabase/migrations/202611180001_dept_galleries.sql", "utf8")
  ).replace("create extension if not exists pgcrypto with schema extensions;", "");
  await db.exec(phase2);
  await db.exec(
    `insert into public.dept_galleries(id,slug,title) values('d0000000-0000-4000-8000-000000000001','existing-private-draft','First collection');`,
  );
  await db.exec(await readFile("supabase/migrations/202611250001_gallery_delivery.sql", "utf8"));
  await db.exec(
    await readFile("supabase/migrations/202611250002_gallery_optional_password.sql", "utf8"),
  );
  await db.exec(await readFile("supabase/migrations/202611250003_gallery_email.sql", "utf8"));
  await db.exec("begin;");
  await db.exec(await readFile("supabase/tests/galleries.sql", "utf8"));
  await db.exec(await readFile("supabase/tests/gallery-delivery.sql", "utf8"));
  await db.exec(await readFile("supabase/tests/gallery-optional-password.sql", "utf8"));
  await db.exec(await readFile("supabase/tests/gallery-email.sql", "utf8"));
  await db.exec("rollback;");
  console.log(
    "PASS: Gallery migration/RLS/delivery/upload/email lifecycle and quota tests (isolated PostgreSQL; pgcrypto substituted).",
  );
} finally {
  await db.close();
}
