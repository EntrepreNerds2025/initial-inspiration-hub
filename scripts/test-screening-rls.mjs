import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,email text,invited_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(await readFile("supabase/migrations/202610150001_screening_room.sql", "utf8"));
  await db.exec(
    await readFile("supabase/migrations/202610160001_defer_invitation_check.sql", "utf8"),
  );
  // Reproduce the real Auth invitation order, which the original fixture missed.
  await db.exec(`begin;
    insert into auth.users(id,email) values('80000000-0000-4000-8000-000000000001','invite@test.invalid');
    update auth.users set invited_at=now() where id='80000000-0000-4000-8000-000000000001';
    commit;`);
  const { rows } = await db.query(
    "select role from public.profiles where id='80000000-0000-4000-8000-000000000001'",
  );
  if (rows[0]?.role !== "viewer") throw new Error("Deferred invitation profile missing");
  try {
    await db.exec(
      "insert into auth.users(id,email) values('80000000-0000-4000-8000-000000000002','no-invite@test.invalid')",
    );
    throw new Error("Uninvited account committed");
  } catch (error) {
    if (error.message !== "Invitation required") throw error;
  }
  await db.exec(await readFile("supabase/tests/permissions.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/202610160002_creator_notes.sql", "utf8"));
  await db.exec(`begin;
    insert into public.videos(id,title,slug,year,youtube_video_id,provider_video_id,is_published,status,creator_note)
    values('83000000-0000-4000-8000-000000000001','Final test','final-test',2026,'aqz-KE-bpKQ','aqz-KE-bpKQ',true,'final','A creator note');
    set local role authenticated;
    select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
    insert into public.feedback(video_id,comment) values('83000000-0000-4000-8000-000000000001','Final film feedback');
    do $$ declare n integer; begin
      update public.videos set creator_note='Viewer edit' where slug='final-test';
      get diagnostics n=row_count; if n<>0 then raise exception 'Viewer edited creator note'; end if;
    end $$;
    reset role; rollback;`);
  console.log(
    "PASS: real PostgreSQL RLS migration and permission assertions in isolated PGlite. No live database modified.",
  );
} finally {
  await db.close();
}
