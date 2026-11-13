-- Live updates on the reading page, switched on/off and timed from Dashboard → Settings.
--
--   app_settings.live_updates   whether open stories check for new lines at all
--   app_settings.poll_seconds   how often they check, 1–300 seconds
--   story_poll(story)           one call per check: the story's change counter + the current setting,
--                               so open pages follow a change made in the dashboard without reloading

alter table public.app_settings
  add column live_updates boolean not null default true,
  add column poll_seconds int not null default 1 check (poll_seconds between 1 and 300);

---------------------------------------------------------------------------
-- Settings: same function, two new optional arguments (left out = unchanged)
---------------------------------------------------------------------------

drop function public.update_settings(int, int, int, boolean);
create or replace function public.update_settings(
  p_max_branches int,
  p_max_depth int,
  p_lines_per_hour int,
  p_auto_approve boolean,
  p_live_updates boolean default null,
  p_poll_seconds int default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_poll_seconds is not null and p_poll_seconds not between 1 and 300 then
    raise exception 'Check for new lines every 1 to 300 seconds.' using errcode = '23514';
  end if;
  update public.app_settings set
    max_branches_per_line = p_max_branches,
    max_depth = p_max_depth,
    lines_per_hour = p_lines_per_hour,
    auto_approve = coalesce(p_auto_approve, true),
    live_updates = coalesce(p_live_updates, live_updates),
    poll_seconds = coalesce(p_poll_seconds, poll_seconds),
    updated_at = now(),
    updated_by = auth.uid()
  where id;
end;
$$;

revoke execute on function public.update_settings(int, int, int, boolean, boolean, int) from public, anon;
grant execute on function public.update_settings(int, int, int, boolean, boolean, int) to authenticated;

create or replace function public.audit_settings()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.log_activity('settings.changed', null, null, null, jsonb_build_object(
    'max_branches_per_line', jsonb_build_array(old.max_branches_per_line, new.max_branches_per_line),
    'max_depth', jsonb_build_array(old.max_depth, new.max_depth),
    'lines_per_hour', jsonb_build_array(old.lines_per_hour, new.lines_per_hour),
    'auto_approve', jsonb_build_array(old.auto_approve, new.auto_approve),
    'live_updates', jsonb_build_array(old.live_updates, new.live_updates),
    'poll_seconds', jsonb_build_array(old.poll_seconds, new.poll_seconds)));
  return null;
end;
$$;
revoke execute on function public.audit_settings() from public, anon, authenticated;

---------------------------------------------------------------------------
-- One check from an open story: its change counter and the live-update setting
---------------------------------------------------------------------------

create or replace function public.story_poll(p_story uuid)
returns table (version bigint, live_updates boolean, poll_seconds int)
language sql stable security invoker
set search_path = public
as $$
  select s.version, a.live_updates, a.poll_seconds
  from public.stories s cross join public.app_settings a
  where s.id = p_story;
$$;

revoke execute on function public.story_poll(uuid) from public;
grant execute on function public.story_poll(uuid) to anon, authenticated;
