-- Dashboard, story limits, limit-increase requests, story status and an activity log.
--
--   app_settings      one row of site-wide rules (branches per line, lines per path, …)
--   stories.status    active / inactive (inactive stories are hidden and frozen)
--   limit_requests    writers ask for more branches on a line, or a longer story
--   activity          append-only audit log, written only by triggers
--
-- Limits are enforced in the database (lines_before_insert), so no client can get round them.

---------------------------------------------------------------------------
-- Site settings
---------------------------------------------------------------------------

create table public.app_settings (
  id boolean primary key default true check (id),
  -- null means "no limit"
  max_branches_per_line int check (max_branches_per_line between 1 and 50),
  -- lines on one path, counting the opening line; null means "no limit"
  max_depth int check (max_depth between 2 and 200),
  lines_per_hour int not null default 10 check (lines_per_hour between 1 and 500),
  invite_slots int not null default 3 check (invite_slots between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles on delete set null
);
insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;
-- Everyone may read the rules: writers are shown them before they write.
create policy "Settings are public" on public.app_settings for select using (true);

---------------------------------------------------------------------------
-- Story status and per-story / per-line overrides
---------------------------------------------------------------------------

create type public.story_status as enum ('active', 'inactive');

alter table public.stories
  add column status public.story_status not null default 'active',
  add column status_reason text check (char_length(status_reason) <= 280),
  add column status_changed_at timestamptz,
  add column status_changed_by uuid references public.profiles on delete set null,
  add column max_branches_override int check (max_branches_override between 1 and 50),
  add column max_depth_override int check (max_depth_override between 2 and 200);

alter table public.lines
  add column branch_limit_override int check (branch_limit_override between 1 and 100);

create index stories_status on public.stories (status, created_at desc);

---------------------------------------------------------------------------
-- Helpers
---------------------------------------------------------------------------

create or replace function public.story_visible(p_story uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stories s
    where s.id = p_story
      and (s.status = 'active' or s.author_id = auth.uid() or public.is_admin())
  )
$$;

create or replace function public.can_manage_story(p_story uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_admin()
      or exists (select 1 from public.stories where id = p_story and author_id = auth.uid())
$$;

-- What a line allows right now. Volatile on purpose: lines_before_insert calls it after
-- taking a lock and needs a fresh snapshot, not the one the INSERT started with.
create or replace function public.line_capacity(p_line uuid)
returns table (
  children int,
  branch_limit int,
  depth int,
  max_depth int,
  story_status public.story_status,
  is_complete boolean
)
language sql volatile security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.lines c where c.parent_id = l.id and not c.hidden),
    coalesce(l.branch_limit_override, s.max_branches_override, a.max_branches_per_line),
    l.depth,
    coalesce(s.max_depth_override, a.max_depth),
    s.status,
    l.is_complete
  from public.lines l
  join public.stories s on s.id = l.story_id
  cross join public.app_settings a
  where l.id = p_line and public.story_visible(s.id)
$$;

create or replace function public.lines_per_hour()
returns int
language sql stable security definer
set search_path = public
as $$ select lines_per_hour from public.app_settings $$;

create or replace function public.invite_slots_total()
returns int
language sql stable security definer
set search_path = public
as $$ select invite_slots from public.app_settings $$;

---------------------------------------------------------------------------
-- Activity log (append-only; only triggers and security-definer functions write it)
---------------------------------------------------------------------------

create table public.activity (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles on delete set null,
  action text not null,
  story_id uuid references public.stories on delete cascade,
  line_id uuid references public.lines on delete set null,
  subject_id uuid references public.profiles on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_recent on public.activity (created_at desc);
create index activity_story on public.activity (story_id, created_at desc);
create index activity_actor on public.activity (actor_id, created_at desc);

alter table public.activity enable row level security;
create policy "Admins see all; authors see their stories and own actions"
  on public.activity for select to authenticated
  using (
    public.is_admin()
    or actor_id = auth.uid()
    or (story_id is not null and exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid()))
  );

create or replace function public.log_activity(
  p_action text, p_story uuid default null, p_line uuid default null,
  p_subject uuid default null, p_details jsonb default '{}'::jsonb
)
returns void
language sql security definer
set search_path = public
as $$
  insert into public.activity (actor_id, action, story_id, line_id, subject_id, details)
  values (auth.uid(), p_action, p_story, p_line, p_subject, coalesce(p_details, '{}'::jsonb))
$$;
revoke execute on function public.log_activity(text, uuid, uuid, uuid, jsonb) from public, anon, authenticated;

-- Profiles: joins and role changes
create or replace function public.audit_profiles()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity (actor_id, action, subject_id) values (new.id, 'user.joined', new.id);
  elsif new.role is distinct from old.role then
    perform public.log_activity('user.role_changed', null, null, new.id,
      jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return null;
end;
$$;
create trigger audit_profiles after insert or update of role on public.profiles
  for each row execute function public.audit_profiles();

-- Stories: created, status, limits
create or replace function public.audit_stories()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity (actor_id, action, story_id, details)
    values (coalesce(auth.uid(), new.author_id), 'story.created', new.id, jsonb_build_object('title', new.title));
    return null;
  end if;
  if new.status is distinct from old.status then
    perform public.log_activity(
      case when new.status = 'inactive' then 'story.inactivated' else 'story.reactivated' end,
      new.id, null, null, jsonb_build_object('title', new.title, 'reason', new.status_reason));
  end if;
  if new.max_branches_override is distinct from old.max_branches_override
     or new.max_depth_override is distinct from old.max_depth_override then
    perform public.log_activity('story.limits_changed', new.id, null, null, jsonb_build_object(
      'title', new.title,
      'max_branches', new.max_branches_override, 'max_depth', new.max_depth_override,
      'old_max_branches', old.max_branches_override, 'old_max_depth', old.max_depth_override));
  end if;
  return null;
end;
$$;
create trigger audit_stories after insert or update of status, max_branches_override, max_depth_override on public.stories
  for each row execute function public.audit_stories();

-- Lines: written, hidden/restored, ending, branch limit raised
create or replace function public.audit_lines()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null then
      insert into public.activity (actor_id, action, story_id, line_id, details)
      values (coalesce(auth.uid(), new.author_id), 'line.written', new.story_id, new.id,
              jsonb_build_object('text', left(new.text, 120), 'depth', new.depth));
    end if;
    return null;
  end if;
  if new.hidden is distinct from old.hidden then
    perform public.log_activity(case when new.hidden then 'line.hidden' else 'line.restored' end,
      new.story_id, new.id, new.author_id, jsonb_build_object('text', left(new.text, 120)));
  end if;
  if new.is_complete and not old.is_complete then
    perform public.log_activity('line.ending', new.story_id, new.id, null, jsonb_build_object('text', left(new.text, 120)));
  end if;
  if new.branch_limit_override is distinct from old.branch_limit_override then
    perform public.log_activity('line.branch_limit_changed', new.story_id, new.id, null,
      jsonb_build_object('from', old.branch_limit_override, 'to', new.branch_limit_override, 'text', left(new.text, 120)));
  end if;
  return null;
end;
$$;
create trigger audit_lines after insert or update of hidden, is_complete, branch_limit_override on public.lines
  for each row execute function public.audit_lines();

-- Invites: created, accepted
create or replace function public.audit_invites()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('invite.created');
  elsif new.used_by is not null and old.used_by is null then
    perform public.log_activity('invite.accepted', null, null, new.inviter_id);
  end if;
  return null;
end;
$$;
create trigger audit_invites after insert or update of used_by on public.invites
  for each row execute function public.audit_invites();

-- Reports
create or replace function public.audit_reports()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare sid uuid;
begin
  select story_id into sid from public.lines where id = new.line_id;
  perform public.log_activity('line.reported', sid, new.line_id, null, jsonb_build_object('reason', new.reason));
  return null;
end;
$$;
create trigger audit_reports after insert on public.reports
  for each row execute function public.audit_reports();

-- Settings
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
    'invite_slots', jsonb_build_array(old.invite_slots, new.invite_slots)));
  return null;
end;
$$;
create trigger audit_settings after update on public.app_settings
  for each row execute function public.audit_settings();

---------------------------------------------------------------------------
-- Enforce limits when a line is written
---------------------------------------------------------------------------

create or replace function public.lines_before_insert()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  parent public.lines;
  cap record;
begin
  new.up := 0;
  new.down := 0;
  new.children := 0;
  new.is_complete := false;
  new.hidden := false;
  new.branch_limit_override := null;
  new.created_at := now();

  if new.parent_id is null then
    if public.is_api_request() then
      raise exception 'Use create_story() to start a story' using errcode = '42501';
    end if;
    new.path := text2ltree(public.ltree_label(new.id));
    new.depth := 0;
    return new;
  end if;

  -- Serialise writes under the same parent so two people can't both take the last slot.
  perform pg_advisory_xact_lock(hashtextextended(new.parent_id::text, 0));

  select * into parent from public.lines where id = new.parent_id;
  if not found then
    raise exception 'Parent line not found' using errcode = '23503';
  end if;
  if parent.story_id <> new.story_id then
    raise exception 'Parent line belongs to a different story' using errcode = '23514';
  end if;
  if parent.is_complete then
    raise exception 'This path has been marked complete' using errcode = '23514';
  end if;

  select * into cap from public.line_capacity(new.parent_id);
  if cap.story_status is distinct from 'active' then
    raise exception 'This story is inactive, so it can''t be continued' using errcode = '23514';
  end if;
  if cap.branch_limit is not null and cap.children >= cap.branch_limit then
    raise exception 'This line already has % branches, the most allowed', cap.branch_limit using errcode = '23514';
  end if;
  if cap.max_depth is not null and parent.depth + 1 >= cap.max_depth then
    raise exception 'This path has reached the story''s limit of % lines', cap.max_depth using errcode = '23514';
  end if;

  new.path := parent.path || text2ltree(public.ltree_label(new.id));
  new.depth := parent.depth + 1;
  return new;
end;
$$;

-- Rate limit now comes from settings.
drop policy "Authors write lines" on public.lines;
create policy "Authors write lines"
  on public.lines for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.can_write()
    and parent_id is not null
    and public.lines_last_hour(auth.uid()) < public.lines_per_hour()
  );

create or replace function public.create_story(p_title text, p_genre text, p_first_line text)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  sid uuid := gen_random_uuid();
  lid uuid := gen_random_uuid();
  s text;
  per_hour int := public.lines_per_hour();
begin
  if uid is null then
    raise exception 'Sign in to start a story' using errcode = '42501';
  end if;
  if not public.can_write() then
    raise exception 'Only verified authors can start stories' using errcode = '42501';
  end if;
  if public.lines_last_hour(uid) >= per_hour then
    raise exception 'You have written % lines in the last hour. Take a breath and try again soon.', per_hour using errcode = '54000';
  end if;

  s := public.slugify(p_title);
  if s = '' then s := 'story'; end if;
  s := s || '-' || left(replace(sid::text, '-', ''), 6);

  insert into public.stories (id, slug, title, genre, author_id)
  values (sid, s, trim(p_title), p_genre, uid);
  insert into public.lines (id, story_id, parent_id, author_id, text, path)
  values (lid, sid, null, uid, trim(p_first_line), text2ltree(public.ltree_label(lid)));
  update public.stories set root_line_id = lid where id = sid;
  insert into public.follows (user_id, story_id) values (uid, sid) on conflict do nothing;
  return s;
end;
$$;

create or replace function public.mark_complete(p_line uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  l public.lines;
begin
  select * into l from public.lines where id = p_line;
  if not found then raise exception 'Line not found'; end if;
  if not public.can_manage_story(l.story_id) then
    raise exception 'Only the story''s starter can mark an ending' using errcode = '42501';
  end if;
  if (select status from public.stories where id = l.story_id) <> 'active' then
    raise exception 'This story is inactive' using errcode = '23514';
  end if;
  if l.children > 0 then
    raise exception 'Only a line with no continuations can be an ending' using errcode = '23514';
  end if;
  update public.lines set is_complete = true where id = p_line;
  update public.stories set finished = true where id = l.story_id;
end;
$$;

-- Admins can't change their own role (prevents locking the last admin out by accident).
create or replace function public.admin_set_role(p_handle text, p_role public.user_role)
returns void
language plpgsql security definer
set search_path = public
as $$
declare target uuid;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select id into target from public.profiles where handle = lower(p_handle);
  if target is null then raise exception 'No user with that handle'; end if;
  if target = auth.uid() then raise exception 'You can''t change your own role' using errcode = '42501'; end if;
  update public.profiles set role = p_role where id = target;
end;
$$;

---------------------------------------------------------------------------
-- Visibility: inactive stories are hidden from everyone but their starter and admins
---------------------------------------------------------------------------

drop policy "Stories are public" on public.stories;
create policy "Active stories are public"
  on public.stories for select
  using (status = 'active' or author_id = auth.uid() or public.is_admin());

drop policy "Visible lines are public" on public.lines;
create policy "Visible lines are public"
  on public.lines for select
  using ((not hidden or author_id = auth.uid() or public.is_admin()) and public.story_visible(story_id));

-- Only vote on, follow or report what you can see.
drop policy "Users vote" on public.votes;
create policy "Users vote"
  on public.votes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.lines l where l.id = line_id));
drop policy "Users change their vote" on public.votes;
create policy "Users change their vote"
  on public.votes for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.lines l where l.id = line_id));
drop policy "Users follow" on public.follows;
create policy "Users follow"
  on public.follows for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.stories s where s.id = story_id));
drop policy "Users report lines" on public.reports;
create policy "Users report lines"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and exists (select 1 from public.lines l where l.id = line_id));

-- The public feed only ever lists active stories.
create or replace view public.story_feed
with (security_invoker = true)
as
select
  s.id, s.slug, s.title, s.genre, s.finished, s.created_at,
  s.line_count, s.vote_count, s.root_line_id, s.author_id,
  p.handle as author_handle,
  r.text as opening_line,
  (greatest(s.vote_count, 0) + s.line_count)::float8
    / power(extract(epoch from now() - s.created_at) / 3600 + 2, 1.5) as trending_score
from public.stories s
join public.profiles p on p.id = s.author_id
left join public.lines r on r.id = s.root_line_id
where s.status = 'active';

---------------------------------------------------------------------------
-- Story management (dashboard)
---------------------------------------------------------------------------

create or replace function public.set_story_status(p_story uuid, p_status public.story_status, p_reason text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  s public.stories;
  changed_by_role public.user_role;
begin
  select * into s from public.stories where id = p_story for update;
  if not found then raise exception 'Story not found'; end if;
  if not public.can_manage_story(p_story) then
    raise exception 'Only the story''s starter or an admin can do that' using errcode = '42501';
  end if;
  if s.status = p_status then return; end if;
  -- A story an admin switched off can only be switched back on by an admin.
  if p_status = 'active' and not public.is_admin() and s.status_changed_by is not null and s.status_changed_by <> auth.uid() then
    select role into changed_by_role from public.profiles where id = s.status_changed_by;
    if changed_by_role = 'admin' then
      raise exception 'An admin made this story inactive. Ask an admin to reactivate it.' using errcode = '42501';
    end if;
  end if;
  update public.stories set
    status = p_status,
    status_reason = case when p_status = 'inactive' then nullif(trim(p_reason), '') else null end,
    status_changed_at = now(),
    status_changed_by = auth.uid()
  where id = p_story;
end;
$$;

create or replace function public.set_story_limits(p_story uuid, p_max_branches int, p_max_depth int)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  update public.stories set max_branches_override = p_max_branches, max_depth_override = p_max_depth
  where id = p_story;
  if not found then raise exception 'Story not found'; end if;
end;
$$;

create or replace function public.update_settings(
  p_max_branches int, p_max_depth int, p_lines_per_hour int, p_invite_slots int
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  update public.app_settings set
    max_branches_per_line = p_max_branches,
    max_depth = p_max_depth,
    lines_per_hour = p_lines_per_hour,
    invite_slots = p_invite_slots,
    updated_at = now(),
    updated_by = auth.uid()
  where id;
end;
$$;

---------------------------------------------------------------------------
-- Limit-increase requests
---------------------------------------------------------------------------

create type public.request_kind as enum ('more_branches', 'more_depth');
create type public.request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table public.limit_requests (
  id uuid primary key default gen_random_uuid(),
  kind public.request_kind not null,
  story_id uuid not null references public.stories on delete cascade,
  line_id uuid not null references public.lines on delete cascade,
  requester_id uuid not null references public.profiles on delete cascade,
  message text not null check (char_length(message) between 10 and 500),
  status public.request_status not null default 'pending',
  granted int check (granted between 1 and 20),
  decided_by uuid references public.profiles on delete set null,
  decision_note text check (char_length(decision_note) <= 280),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index limit_requests_one_pending
  on public.limit_requests (requester_id, line_id, kind) where status = 'pending';
create index limit_requests_story on public.limit_requests (story_id, status, created_at desc);
create index limit_requests_status on public.limit_requests (status, created_at desc);

alter table public.limit_requests enable row level security;
create policy "Requesters, story starters and admins see requests"
  on public.limit_requests for select to authenticated
  using (requester_id = auth.uid() or public.can_manage_story(story_id));
-- No insert/update/delete policies: only the functions below change requests.

create or replace function public.request_limit_increase(p_line uuid, p_kind public.request_kind, p_message text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cap record;
  sid uuid;
  rid uuid;
begin
  if uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not public.can_write() then
    raise exception 'Only verified authors can ask for more room' using errcode = '42501';
  end if;
  select story_id into sid from public.lines where id = p_line and not hidden;
  select * into cap from public.line_capacity(p_line);
  if sid is null or cap.story_status is null then raise exception 'Line not found'; end if;
  if cap.story_status <> 'active' then raise exception 'This story is inactive' using errcode = '23514'; end if;
  if cap.is_complete then raise exception 'The story''s starter ended the story here on purpose' using errcode = '23514'; end if;

  if p_kind = 'more_branches' and (cap.branch_limit is null or cap.children < cap.branch_limit) then
    raise exception 'This line still has room for more branches' using errcode = '23514';
  end if;
  if p_kind = 'more_depth' and (cap.max_depth is null or cap.depth + 1 < cap.max_depth) then
    raise exception 'This path hasn''t reached the story''s length limit yet' using errcode = '23514';
  end if;
  if exists (select 1 from public.limit_requests where requester_id = uid and line_id = p_line and kind = p_kind and status = 'pending') then
    raise exception 'You already have a pending request for this line' using errcode = '23505';
  end if;
  if (select count(*) from public.limit_requests where requester_id = uid and status = 'pending') >= 5 then
    raise exception 'You have 5 requests waiting already. Wait for those to be reviewed first.' using errcode = '54000';
  end if;

  insert into public.limit_requests (kind, story_id, line_id, requester_id, message)
  values (p_kind, sid, p_line, uid, trim(p_message))
  returning id into rid;
  perform public.log_activity('request.created', sid, p_line, null, jsonb_build_object('kind', p_kind, 'request_id', rid));
  return rid;
end;
$$;

-- Approve (granting 1–20 more branches on the line, or more lines on every path of the story) or reject.
create or replace function public.decide_limit_request(p_request uuid, p_approve boolean, p_granted int default 1, p_note text default null)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  r public.limit_requests;
  cap record;
begin
  select * into r from public.limit_requests where id = p_request for update;
  if not found then raise exception 'Request not found'; end if;
  if not public.can_manage_story(r.story_id) then
    raise exception 'Only the story''s starter or an admin can review this' using errcode = '42501';
  end if;
  if r.requester_id = auth.uid() and not public.is_admin() then
    raise exception 'You can''t review your own request' using errcode = '42501';
  end if;
  if r.status <> 'pending' then raise exception 'This request has already been %', r.status; end if;

  if p_approve then
    if p_granted is null or p_granted < 1 or p_granted > 20 then
      raise exception 'Grant between 1 and 20' using errcode = '23514';
    end if;
    select * into cap from public.line_capacity(r.line_id);
    if r.kind = 'more_branches' then
      update public.lines
        set branch_limit_override = least(greatest(coalesce(cap.branch_limit, cap.children), cap.children) + p_granted, 100)
        where id = r.line_id;
    else
      update public.stories
        set max_depth_override = least(greatest(coalesce(cap.max_depth, cap.depth + 1), cap.depth + 1) + p_granted, 200)
        where id = r.story_id;
    end if;
  end if;

  update public.limit_requests set
    status = case when p_approve then 'approved'::public.request_status else 'rejected'::public.request_status end,
    granted = case when p_approve then p_granted end,
    decided_by = auth.uid(),
    decided_at = now(),
    decision_note = nullif(trim(p_note), '')
  where id = p_request;

  perform public.log_activity(case when p_approve then 'request.approved' else 'request.rejected' end,
    r.story_id, r.line_id, r.requester_id,
    jsonb_build_object('kind', r.kind, 'granted', case when p_approve then p_granted end, 'request_id', r.id));
end;
$$;

create or replace function public.cancel_limit_request(p_request uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare r public.limit_requests;
begin
  select * into r from public.limit_requests where id = p_request for update;
  if not found or r.requester_id <> auth.uid() then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'Only pending requests can be cancelled'; end if;
  update public.limit_requests set status = 'cancelled', decided_at = now() where id = p_request;
  perform public.log_activity('request.cancelled', r.story_id, r.line_id, null, jsonb_build_object('kind', r.kind));
end;
$$;

---------------------------------------------------------------------------
-- Dashboard read models
---------------------------------------------------------------------------

create or replace view public.dashboard_stories
with (security_invoker = true)
as
select
  s.id, s.slug, s.title, s.genre, s.status, s.status_reason, s.status_changed_at,
  s.author_id, p.handle as author_handle, s.created_at, s.finished,
  s.line_count, s.vote_count,
  s.max_branches_override, s.max_depth_override,
  coalesce(s.max_branches_override, a.max_branches_per_line) as effective_max_branches,
  coalesce(s.max_depth_override, a.max_depth) as effective_max_depth,
  (select coalesce(max(l.depth), 0) + 1 from public.lines l where l.story_id = s.id) as longest_path,
  (select count(*) from public.limit_requests r where r.story_id = s.id and r.status = 'pending')::int as pending_requests
from public.stories s
join public.profiles p on p.id = s.author_id
cross join public.app_settings a;

create or replace view public.dashboard_users
with (security_invoker = true)
as
select
  p.id, p.handle, p.display_name, p.avatar_url, p.role, p.created_at,
  inv.handle as invited_by_handle,
  (select count(*) from public.lines l where l.author_id = p.id and l.parent_id is not null)::int as lines_written,
  (select count(*) from public.stories s where s.author_id = p.id)::int as stories_started,
  (select max(a.created_at) from public.activity a where a.actor_id = p.id) as last_active
from public.profiles p
left join public.profiles inv on inv.id = p.invited_by;

-- Headline numbers. Admins get the whole site; authors get their own stories.
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  admin boolean := public.is_admin();
begin
  if not public.can_write() then raise exception 'Authors and admins only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'scope', case when admin then 'site' else 'mine' end,
    'users', case when admin then (select jsonb_object_agg(role, n) from (select role, count(*) n from public.profiles group by role) x) end,
    'stories_active', (select count(*) from public.stories where status = 'active' and (admin or author_id = uid)),
    'stories_inactive', (select count(*) from public.stories where status = 'inactive' and (admin or author_id = uid)),
    'lines_7d', (select count(*) from public.lines l join public.stories s on s.id = l.story_id
                 where l.created_at > now() - interval '7 days' and l.parent_id is not null and (admin or s.author_id = uid)),
    'pending_requests', (select count(*) from public.limit_requests r join public.stories s on s.id = r.story_id
                         where r.status = 'pending' and (admin or s.author_id = uid)),
    'my_pending_requests', (select count(*) from public.limit_requests where status = 'pending' and requester_id = uid),
    'open_reports', case when admin then (select count(distinct line_id) from public.reports where not resolved) end
  );
end;
$$;

---------------------------------------------------------------------------
-- Function access
---------------------------------------------------------------------------

revoke execute on function public.set_story_status(uuid, public.story_status, text) from public, anon;
revoke execute on function public.set_story_limits(uuid, int, int) from public, anon;
revoke execute on function public.update_settings(int, int, int, int) from public, anon;
revoke execute on function public.request_limit_increase(uuid, public.request_kind, text) from public, anon;
revoke execute on function public.decide_limit_request(uuid, boolean, int, text) from public, anon;
revoke execute on function public.cancel_limit_request(uuid) from public, anon;
revoke execute on function public.dashboard_stats() from public, anon;

grant execute on function public.set_story_status(uuid, public.story_status, text) to authenticated;
grant execute on function public.set_story_limits(uuid, int, int) to authenticated;
grant execute on function public.update_settings(int, int, int, int) to authenticated;
grant execute on function public.request_limit_increase(uuid, public.request_kind, text) to authenticated;
grant execute on function public.decide_limit_request(uuid, boolean, int, text) to authenticated;
grant execute on function public.cancel_limit_request(uuid) to authenticated;
grant execute on function public.dashboard_stats() to authenticated;

-- Trigger functions are never called directly.
revoke execute on function public.audit_profiles() from public, anon, authenticated;
revoke execute on function public.audit_stories() from public, anon, authenticated;
revoke execute on function public.audit_lines() from public, anon, authenticated;
revoke execute on function public.audit_invites() from public, anon, authenticated;
revoke execute on function public.audit_reports() from public, anon, authenticated;
revoke execute on function public.audit_settings() from public, anon, authenticated;

-- Live updates for story status changes too.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.stories;
  end if;
end $$;
