-- Votes no longer bump stories.version.
--
-- Open reading pages reload whenever stories.version moves (live updates). On a busy story every
-- vote made every open reader reload the whole page. Now only changes to the lines themselves
-- move it (a new published line, an approval, an edit, hiding). Vote counts still update in the
-- database straight away; readers see others' votes on their next reload or the next new line,
-- and their own votes instantly (optimistic, then confirmed by the vote action).

create or replace function public.votes_counter()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  old_v int := 0;
  new_v int := 0;
  lid uuid;
begin
  if tg_op in ('UPDATE', 'DELETE') then old_v := old.value; end if;
  if tg_op in ('INSERT', 'UPDATE') then new_v := new.value; end if;
  lid := coalesce(new.line_id, old.line_id);
  update public.lines set
    up   = up   + (case when new_v = 1 then 1 else 0 end) - (case when old_v = 1 then 1 else 0 end),
    down = down + (case when new_v = -1 then 1 else 0 end) - (case when old_v = -1 then 1 else 0 end)
  where id = lid;
  update public.stories set vote_count = vote_count + (new_v - old_v)
  where id = (select story_id from public.lines where id = lid);
  return null;
end;
$$;

revoke execute on function public.votes_counter() from public, anon, authenticated;
