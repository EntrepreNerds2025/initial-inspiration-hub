-- DO NOT RUN WITHOUT APPROVAL. Operational activation only; not a migration.
-- Prerequisites: pg_cron, pg_net, Vault and the approved deployed email function.
-- Add the dedicated secret via secure setup, never by committing its value here.
begin;
do $$ begin
 if not exists(select 1 from dept_gallery_private.email_controls where enabled and verified_until>now()) then raise exception 'Approve and verify free-plan setup before installing schedule'; end if;
 if not exists(select 1 from vault.decrypted_secrets where name='gallery_email_cron_secret' and length(decrypted_secret)>=32) then raise exception 'Dedicated scheduler secret missing'; end if;
 if exists(select 1 from cron.job where jobname='dept-gallery-email-hourly') then raise exception 'Schedule already exists; inspect instead of duplicating'; end if;
end; $$;
select cron.schedule('dept-gallery-email-hourly','5 * * * *',$job$
 select net.http_post(
   url:='https://pozmyqfosfaeheiqwioh.supabase.co/functions/v1/gallery-email?action=tick',
   headers:=jsonb_build_object('Content-Type','application/json','x-gallery-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='gallery_email_cron_secret')),
   body:='{}'::jsonb, timeout_milliseconds:=90000
 ) where exists(select 1 from dept_gallery_private.email_controls where enabled and verified_until>now());
$job$);
commit;
