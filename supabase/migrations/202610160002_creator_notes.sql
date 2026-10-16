begin;
-- Optional additive field; existing film records and all access policies are preserved.
alter table public.videos add column creator_note text not null default '' check(length(creator_note)<=4000);
alter table public.videos add column display_status text not null default '' check(display_status in ('','FINAL','ROUGH CUT','WIP','FIRST CUT','IN EDIT','EXPERIMENT','UNRELEASED','ARCHIVE','NEEDS FEEDBACK'));
-- Allow invited viewers to discuss any published screening, not only draft cuts.
alter policy feedback_read on public.feedback using(public.is_admin() or (public.is_member() and exists(select 1 from public.videos v where v.id=feedback.video_id and v.is_published)));
alter policy feedback_create on public.feedback with check(public.is_member() and user_id=auth.uid() and exists(select 1 from public.videos v where v.id=feedback.video_id and (v.is_published or public.is_admin())));

commit;
