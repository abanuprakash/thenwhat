-- Live updates refresh a reading page only when something that page shows has changed.
--
-- Before, any change anywhere in the story (a line deep in another branch) reloaded every open
-- reading page of that story: about 17 queries each. Now the check returns a fingerprint of
-- just the lines the page shows: the path to the current line, its branches, and the mini tree
-- (the story's top levels, as line_subtree draws them). Changes elsewhere don't reload it.

-- When a line last changed in a way readers can see (new, edited, approved, hidden, finished).
-- Vote counters (up, down, score) don't count.
alter table public.lines add column changed_at timestamptz not null default now();
update public.lines set changed_at = greatest(created_at, coalesce(edited_at, created_at), coalesce(reviewed_at, created_at));

create or replace function public.lines_touch_changed()
returns trigger
language plpgsql
as $$
begin
  new.changed_at := now();
  return new;
end;
$$;
revoke execute on function public.lines_touch_changed() from public, anon, authenticated;

create trigger lines_touch_changed
  before update of text, status, hidden, is_complete on public.lines
  for each row execute function public.lines_touch_changed();

create index if not exists lines_story_depth on public.lines (story_id, depth);

-- story_poll(story)        → the story's change counter (as before)
-- story_poll(story, line)  → a fingerprint of what that line's reading page shows
drop function public.story_poll(uuid);
create or replace function public.story_poll(p_story uuid, p_line uuid default null)
returns table (version bigint, live_updates boolean, poll_seconds int)
language sql stable security invoker
set search_path = public, extensions
as $$
  with cur as (
    select l.id, l.path, l.depth from public.lines l where l.id = p_line and l.story_id = p_story
  ),
  shown as (
    -- Same reach as the reading page: path, branches, and the mini tree's levels.
    select l.changed_at
    from public.lines l, cur
    where l.story_id = p_story
      and (l.depth <= least(cur.depth + 2, 8) or l.path @> cur.path or l.parent_id = cur.id)
  )
  select
    case
      when p_line is null then s.version
      else coalesce((select count(*) * 1000003 + coalesce(floor(extract(epoch from max(changed_at)) * 1000)::bigint, 0) from shown), 0)
    end,
    a.live_updates,
    a.poll_seconds
  from public.stories s cross join public.app_settings a
  where s.id = p_story
    and (p_line is null or exists (select 1 from cur));
$$;

revoke execute on function public.story_poll(uuid, uuid) from public;
grant execute on function public.story_poll(uuid, uuid) to anon, authenticated;
