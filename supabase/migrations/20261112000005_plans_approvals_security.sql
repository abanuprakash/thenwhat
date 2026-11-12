-- Onboarding, plans, line approval, line edits, rate limiting and stricter input checks.
--
--   profiles.onboarded        people choose a name and handle after their first sign-in
--   plans / plan_features     per-person plans; which features each plan includes (editable by admins)
--   lines.status              pending → published (or rejected); auto-approve per site and per story
--   lines.pending_text        an edit to a published line waits for approval
--   rate_limits               fixed-window counters used by the app (sign-in emails, votes, forms…)
--
-- Every rule here is enforced in the database, so it holds whatever calls the API.

---------------------------------------------------------------------------
-- Text hygiene: no control characters, zero-width characters or bidi overrides
-- (stops invisible text, spoofed handles and "Trojan source" style tricks).
---------------------------------------------------------------------------

create or replace function public.text_is_clean(t text)
returns boolean
language sql immutable parallel safe
as $$
  select t is null or t !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F​-‏‪-‮⁠-⁤⁦-⁩﻿]'
$$;

alter table public.lines
  add constraint lines_text_clean check (public.text_is_clean(text));
alter table public.stories
  add constraint stories_title_clean check (public.text_is_clean(title) and public.text_is_clean(status_reason));
alter table public.profiles
  add constraint profiles_text_clean check (public.text_is_clean(display_name) and public.text_is_clean(bio));
alter table public.reports
  add constraint reports_reason_clean check (public.text_is_clean(reason));
alter table public.limit_requests
  add constraint limit_requests_text_clean check (public.text_is_clean(message) and public.text_is_clean(decision_note));

---------------------------------------------------------------------------
-- Handles: unique, lowercase, 3–24 of a-z 0-9 . _, not starting/ending with . or _, no reserved words
---------------------------------------------------------------------------

create or replace function public.handle_is_valid(h text)
returns boolean
language sql immutable parallel safe
as $$
  select h ~ '^[a-z0-9][a-z0-9_.]{1,22}[a-z0-9]$'
     and h !~ '[._]{2}'
     and h not in (
       'admin', 'administrator', 'root', 'support', 'help', 'storybranch', 'thenwhat', 'then_what', 'official', 'staff', 'moderator', 'mod',
       'system', 'null', 'undefined', 'api', 'auth', 'login', 'logout', 'signup', 'signin', 'dashboard', 'settings',
       'welcome', 'pricing', 'invite', 'invites', 'new', 'write', 'edit', 'me', 'you', 'security', 'billing', 'team'
     )
$$;

alter table public.profiles drop constraint if exists profiles_handle_check;
alter table public.profiles add constraint profiles_handle_valid check (public.handle_is_valid(handle));

---------------------------------------------------------------------------
-- Plans and features
---------------------------------------------------------------------------

create table public.plans (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,29}$'),
  name text not null check (char_length(name) between 1 and 40 and public.text_is_clean(name)),
  description text check (char_length(description) <= 280 and public.text_is_clean(description)),
  price_inr int not null default 0 check (price_inr between 0 and 1000000),
  sort int not null default 0,
  active boolean not null default true
);

-- The features a plan can switch on. Reading published stories is always free.
create or replace function public.feature_names()
returns text[]
language sql immutable
as $$ select array['vote','follow','report','write_lines','edit_lines','start_stories','invite','request_more','review_requests','story_rules','approvals'] $$;

create table public.plan_features (
  plan_id text not null references public.plans on delete cascade on update cascade,
  feature text not null check (feature = any (public.feature_names())),
  enabled boolean not null default false,
  quota int check (quota is null or quota between 0 and 100000), -- null = unlimited
  primary key (plan_id, feature)
);

insert into public.plans (id, name, description, price_inr, sort) values
  ('free', 'Free', 'Read every story, vote, follow and report.', 0, 0),
  ('author', 'Author', 'Write lines, edit your own, start up to 3 stories and invite 3 people.', 199, 1),
  ('author_pro', 'Author Pro', 'Unlimited stories, 10 invites, your own story rules and approval queue.', 499, 2);

insert into public.plan_features (plan_id, feature, enabled, quota)
select p.id, f.feature,
  case
    when f.feature in ('vote', 'follow', 'report') then true
    when p.id = 'author' and f.feature in ('write_lines', 'edit_lines', 'start_stories', 'invite', 'request_more', 'review_requests') then true
    when p.id = 'author_pro' then true
    else false
  end,
  case
    when p.id = 'author' and f.feature = 'start_stories' then 3
    when p.id = 'author' and f.feature = 'invite' then 3
    when p.id = 'author_pro' and f.feature = 'invite' then 10
    else null
  end
from public.plans p cross join unnest(public.feature_names()) as f(feature);

alter table public.plans enable row level security;
alter table public.plan_features enable row level security;
create policy "Plans are public" on public.plans for select using (true);
create policy "Plan features are public" on public.plan_features for select using (true);

alter table public.profiles
  add column plan_id text not null default 'free' references public.plans on update cascade,
  add column plan_expires_at timestamptz,
  add column onboarded boolean not null default false;

-- The plan that applies right now (an expired plan falls back to Free).
-- Functions starting with _ take any user id and are only callable by other database functions;
-- the public versions only ever answer for the person asking.
create or replace function public._effective_plan(p_uid uuid)
returns text
language sql stable security definer
set search_path = public
as $$
  select case
    when p.plan_expires_at is not null and p.plan_expires_at <= now() then 'free'
    when not exists (select 1 from public.plans pl where pl.id = p.plan_id and pl.active) then 'free'
    else p.plan_id
  end
  from public.profiles p where p.id = p_uid
$$;

-- Admins have every feature. Everyone else gets what their plan switches on.
create or replace function public._has_feature(p_feature text, p_uid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select case
    when p_uid is null then false
    when (select role from public.profiles where id = p_uid) = 'admin' then true
    else coalesce((
      select pf.enabled from public.plan_features pf
      where pf.plan_id = public._effective_plan(p_uid) and pf.feature = p_feature
    ), false)
  end
$$;

-- null = unlimited
create or replace function public._feature_quota(p_feature text, p_uid uuid)
returns int
language sql stable security definer
set search_path = public
as $$
  select case
    when (select role from public.profiles where id = p_uid) = 'admin' then null
    else (select pf.quota from public.plan_features pf
          where pf.plan_id = public._effective_plan(p_uid) and pf.feature = p_feature)
  end
$$;

create or replace function public.effective_plan()
returns text language sql stable security definer set search_path = public
as $$ select public._effective_plan(auth.uid()) $$;

create or replace function public.has_feature(p_feature text)
returns boolean language sql stable security definer set search_path = public
as $$ select public._has_feature(p_feature, auth.uid()) $$;

create or replace function public.feature_quota(p_feature text)
returns int language sql stable security definer set search_path = public
as $$ select public._feature_quota(p_feature, auth.uid()) $$;

revoke execute on function public._effective_plan(uuid) from public, anon, authenticated;
revoke execute on function public._has_feature(text, uuid) from public, anon, authenticated;
revoke execute on function public._feature_quota(text, uuid) from public, anon, authenticated;

-- Everything the app needs to show what the signed-in person can do.
create or replace function public.my_entitlements()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'plan', public.effective_plan(),
    'plan_name', (select name from public.plans where id = public.effective_plan()),
    'plan_expires_at', (select plan_expires_at from public.profiles where id = auth.uid()),
    'features', (
      select jsonb_object_agg(f, jsonb_build_object('enabled', public.has_feature(f), 'quota', public.feature_quota(f)))
      from unnest(public.feature_names()) as f
    ),
    'stories_started', (select count(*) from public.stories where author_id = auth.uid()),
    'invites_in_use', public.invite_slots_used(auth.uid())
  )
  where auth.uid() is not null
$$;

---------------------------------------------------------------------------
-- Rate limiting (fixed windows). Called by the app's server code; never by browsers.
---------------------------------------------------------------------------

create table public.rate_limits (
  key text not null check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security; -- no policies: only the function below touches it

create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql volatile security definer
set search_path = public
as $$
declare
  w timestamptz;
  n int;
begin
  if p_key is null or char_length(p_key) > 200 or p_max < 1 or p_window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate limit' using errcode = '22023';
  end if;
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into n;
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return n <= p_max;
end;
$$;

---------------------------------------------------------------------------
-- Profiles: who can change what
---------------------------------------------------------------------------

-- Avatars are either our own processed upload or the Google photo; nothing else.
create or replace function public.avatar_url_ok(p_url text, p_uid uuid)
returns boolean
language sql immutable
as $$
  select p_url is null
      or p_url ~ ('^/media/avatars/' || p_uid::text || '/[0-9a-f-]{36}\.webp$')
      or (char_length(p_url) <= 500 and p_url ~ '^https://lh3\.googleusercontent\.com/[A-Za-z0-9_/=.-]+$')
$$;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
as $$
begin
  if public.is_api_request() and (
       new.role is distinct from old.role
    or new.invited_by is distinct from old.invited_by
    or new.id is distinct from old.id
    or new.plan_id is distinct from old.plan_id
    or new.plan_expires_at is distinct from old.plan_expires_at
    or new.onboarded is distinct from old.onboarded
    or new.avatar_url is distinct from old.avatar_url
  ) then
    raise exception 'That can''t be changed here' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.set_avatar_url(p_url text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not public.avatar_url_ok(p_url, auth.uid()) then raise exception 'That image address isn''t allowed' using errcode = '22023'; end if;
  update public.profiles set avatar_url = p_url where id = auth.uid();
end;
$$;

create or replace function public.handle_available(p_handle text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.handle_is_valid(lower(p_handle))
     and not exists (select 1 from public.profiles where handle = lower(p_handle) and id is distinct from auth.uid())
$$;

create or replace function public.complete_onboarding(p_handle text, p_display_name text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  h text := lower(trim(p_handle));
  n text := trim(p_display_name);
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not public.handle_is_valid(h) then
    raise exception 'Handles are 3–24 letters, numbers, dots or underscores, and some words are reserved' using errcode = '22023';
  end if;
  if n is null or char_length(n) not between 1 and 60 then
    raise exception 'Your name needs 1–60 characters' using errcode = '22023';
  end if;
  if exists (select 1 from public.profiles where handle = h and id <> auth.uid()) then
    raise exception 'That handle is taken' using errcode = '23505';
  end if;
  update public.profiles set handle = h, display_name = n, onboarded = true where id = auth.uid();
end;
$$;

-- New accounts: name and photo from Google when present, a unique handle from the email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 0;
  pic text := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture');
  v_name text := left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 60);
begin
  base := lower(regexp_replace(split_part(coalesce(new.email, 'reader'), '@', 1), '[^a-zA-Z0-9]', '', 'g'));
  base := left(base, 16);
  if char_length(base) < 3 then base := 'reader' || base; end if;
  candidate := base;
  while not public.handle_is_valid(candidate) or exists (select 1 from public.profiles where handle = candidate) loop
    n := n + 1;
    candidate := base || floor(random() * 900000 + 100000)::int::text;
    exit when n > 30;
  end loop;

  if not public.text_is_clean(v_name) or v_name = '' then v_name := candidate; end if;
  if not public.avatar_url_ok(pic, new.id) then pic := null; end if;

  insert into public.profiles (id, handle, display_name, avatar_url) values (new.id, candidate, v_name, pic);
  return new;
end;
$$;

---------------------------------------------------------------------------
-- Line approval and edits
---------------------------------------------------------------------------

create type public.line_status as enum ('pending', 'published', 'rejected');

alter table public.lines
  add column status public.line_status not null default 'published',
  add column reviewed_by uuid references public.profiles on delete set null,
  add column reviewed_at timestamptz,
  add column review_note text check (char_length(review_note) <= 280 and public.text_is_clean(review_note)),
  add column pending_text text check (char_length(pending_text) between 1 and 280 and public.text_is_clean(pending_text)),
  add column pending_text_at timestamptz,
  add column edited_at timestamptz;

create index lines_pending on public.lines (story_id, created_at) where status = 'pending' or pending_text is not null;

alter table public.app_settings add column auto_approve boolean not null default true;
alter table public.stories
  add column auto_approve_override boolean,      -- null = follow the site setting
  add column version bigint not null default 0;  -- bumped on every visible change; pages poll it

create or replace function public.story_auto_approve(p_story uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(s.auto_approve_override, a.auto_approve)
  from public.stories s cross join public.app_settings a where s.id = p_story
$$;

-- Who may approve lines in a story: admins, or the starter on a plan with approvals.
create or replace function public.can_review_story(p_story uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_admin()
      or (exists (select 1 from public.stories where id = p_story and author_id = auth.uid())
          and public.has_feature('approvals'))
$$;

-- Pending and published lines both take a branch slot, so approvals can't overshoot the limit.
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
    (select count(*)::int from public.lines c where c.parent_id = l.id and not c.hidden and c.status <> 'rejected'),
    coalesce(l.branch_limit_override, s.max_branches_override, a.max_branches_per_line),
    l.depth,
    coalesce(s.max_depth_override, a.max_depth),
    s.status,
    l.is_complete
  from public.lines l
  join public.stories s on s.id = l.story_id
  cross join public.app_settings a
  where l.id = p_line and public.story_visible(s.id) and l.status = 'published'
$$;

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
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.review_note := null;
  new.pending_text := null;
  new.pending_text_at := null;
  new.edited_at := null;
  new.created_at := now();

  if new.parent_id is null then
    if public.is_api_request() then
      raise exception 'Use create_story() to start a story' using errcode = '42501';
    end if;
    new.path := text2ltree(public.ltree_label(new.id));
    new.depth := 0;
    new.status := 'published';
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.parent_id::text, 0));

  select * into parent from public.lines where id = new.parent_id;
  if not found then
    raise exception 'Parent line not found' using errcode = '23503';
  end if;
  if parent.story_id <> new.story_id then
    raise exception 'Parent line belongs to a different story' using errcode = '23514';
  end if;
  if parent.status <> 'published' then
    raise exception 'That line hasn''t been published yet' using errcode = '23514';
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
  -- The starter and admins publish straight away; everyone else follows the story's approval setting.
  new.status := case
    when public.story_auto_approve(new.story_id) or public.can_manage_story(new.story_id) or not public.is_api_request()
      then 'published'::public.line_status
    else 'pending'::public.line_status
  end;
  return new;
end;
$$;

-- Counters only count published lines; pages poll stories.version for changes.
create or replace function public.lines_after_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'published' then
    if new.parent_id is not null then
      update public.lines set children = children + 1 where id = new.parent_id;
    end if;
    update public.stories set line_count = line_count + 1, version = version + 1 where id = new.story_id;
  end if;
  return null;
end;
$$;

create or replace function public.lines_after_status()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'published' and old.status <> 'published' then
    if new.parent_id is not null then
      update public.lines set children = children + 1 where id = new.parent_id;
    end if;
    update public.stories set line_count = line_count + 1 where id = new.story_id;
  end if;
  update public.stories set version = version + 1 where id = new.story_id;
  return null;
end;
$$;
create trigger lines_after_status after update of status, text, hidden on public.lines
  for each row execute function public.lines_after_status();

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
  update public.stories set vote_count = vote_count + (new_v - old_v), version = version + 1
  where id = (select story_id from public.lines where id = lid);
  return null;
end;
$$;

-- Approve or reject a pending line, or a pending edit to a published one.
create or replace function public.review_line(p_line uuid, p_approve boolean, p_note text default null)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  l public.lines;
  parent public.lines;
  result text;
begin
  select * into l from public.lines where id = p_line for update;
  if not found then raise exception 'Line not found'; end if;
  if not public.can_review_story(l.story_id) then
    raise exception 'Only the story''s starter (on a plan with approvals) or an admin can review this' using errcode = '42501';
  end if;
  if (select status from public.stories where id = l.story_id) <> 'active' then
    raise exception 'This story is inactive' using errcode = '23514';
  end if;

  if l.status = 'pending' then
    if p_approve then
      select * into parent from public.lines where id = l.parent_id;
      if parent.is_complete or parent.status <> 'published' then
        raise exception 'The line above it has been ended or removed, so this can''t be published' using errcode = '23514';
      end if;
      update public.lines set status = 'published', reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_note), '')
        where id = p_line;
      result := 'line.approved';
    else
      update public.lines set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_note), '')
        where id = p_line;
      result := 'line.rejected';
    end if;
  elsif l.pending_text is not null then
    if p_approve then
      update public.lines set text = l.pending_text, pending_text = null, pending_text_at = null, edited_at = now(),
        reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_note), '')
        where id = p_line;
      result := 'line.edit_approved';
    else
      update public.lines set pending_text = null, pending_text_at = null,
        reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(trim(p_note), '')
        where id = p_line;
      result := 'line.edit_rejected';
    end if;
  else
    raise exception 'There''s nothing waiting for review on this line';
  end if;

  perform public.log_activity(result, l.story_id, l.id, l.author_id, jsonb_build_object('text', left(coalesce(l.pending_text, l.text), 120), 'note', nullif(trim(p_note), '')));
  return result;
end;
$$;

-- Authors can edit their own line while nothing has been written under it.
create or replace function public.edit_line(p_line uuid, p_text text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  l public.lines;
  t text := trim(p_text);
  direct boolean;
  result text;
begin
  select * into l from public.lines where id = p_line for update;
  if not found or l.author_id is distinct from auth.uid() then raise exception 'Line not found'; end if;
  if not public.has_feature('edit_lines') then
    raise exception 'Editing lines isn''t part of your plan' using errcode = '42501';
  end if;
  if l.hidden then raise exception 'This line is hidden after reports and can''t be edited' using errcode = '23514'; end if;
  if l.parent_id is null and not public.can_manage_story(l.story_id) then raise exception 'Line not found'; end if;
  if (select status from public.stories where id = l.story_id) <> 'active' then
    raise exception 'This story is inactive' using errcode = '23514';
  end if;
  if exists (select 1 from public.lines c where c.parent_id = l.id and c.status <> 'rejected') then
    raise exception 'Someone has already continued this line, so it can''t be changed' using errcode = '23514';
  end if;
  if (select count(*) from public.activity where actor_id = auth.uid() and action like 'line.edit%' and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'You''ve edited 20 lines in the last hour. Try again later.' using errcode = '54000';
  end if;
  if t = l.text and l.pending_text is null and l.status = 'published' then return 'unchanged'; end if;

  direct := public.story_auto_approve(l.story_id) or public.can_manage_story(l.story_id);

  if l.status in ('pending', 'rejected') then
    update public.lines set text = t, edited_at = now(), review_note = null,
      status = case when direct then 'published'::public.line_status else 'pending'::public.line_status end
      where id = p_line;
    result := case when direct then 'line.edited' else 'line.edit_submitted' end;
  elsif direct then
    update public.lines set text = t, edited_at = now(), pending_text = null, pending_text_at = null where id = p_line;
    result := 'line.edited';
  else
    update public.lines set pending_text = t, pending_text_at = now(), review_note = null where id = p_line;
    result := 'line.edit_submitted';
  end if;

  perform public.log_activity(result, l.story_id, l.id, null, jsonb_build_object('text', left(t, 120)));
  return result;
end;
$$;

---------------------------------------------------------------------------
-- Plan checks wired into existing actions
---------------------------------------------------------------------------

-- Writing a line: verified author + plan feature + hourly limit.
drop policy "Authors write lines" on public.lines;
create policy "Authors write lines"
  on public.lines for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.can_write()
    and public.has_feature('write_lines')
    and parent_id is not null
    and public.lines_last_hour(auth.uid()) < public.lines_per_hour()
  );

-- Published lines are public; pending/rejected ones only for their writer, the starter and admins.
drop policy "Visible lines are public" on public.lines;
create policy "Visible lines are public"
  on public.lines for select
  using (
    public.story_visible(story_id)
    and (
      (status = 'published' and not hidden)
      or author_id = auth.uid()
      or public.can_manage_story(story_id)
    )
  );

drop policy "Users vote" on public.votes;
create policy "Users vote"
  on public.votes for insert to authenticated
  with check (
    user_id = auth.uid() and public.has_feature('vote')
    and exists (select 1 from public.lines l where l.id = line_id and l.status = 'published' and not l.hidden)
  );
drop policy "Users change their vote" on public.votes;
create policy "Users change their vote"
  on public.votes for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid() and public.has_feature('vote')
    and exists (select 1 from public.lines l where l.id = line_id and l.status = 'published' and not l.hidden)
  );
drop policy "Users follow" on public.follows;
create policy "Users follow"
  on public.follows for insert to authenticated
  with check (user_id = auth.uid() and public.has_feature('follow') and exists (select 1 from public.stories s where s.id = story_id));
drop policy "Users report lines" on public.reports;
create policy "Users report lines"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.has_feature('report') and exists (select 1 from public.lines l where l.id = line_id));

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
  quota int := public.feature_quota('start_stories');
begin
  if uid is null then
    raise exception 'Sign in to start a story' using errcode = '42501';
  end if;
  if not public.can_write() then
    raise exception 'Only verified authors can start stories' using errcode = '42501';
  end if;
  if not public.has_feature('start_stories') then
    raise exception 'Starting stories isn''t part of your plan' using errcode = '42501';
  end if;
  if quota is not null and (select count(*) from public.stories where author_id = uid) >= quota then
    raise exception 'Your plan allows % stories, and you''ve started them all', quota using errcode = '54000';
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

-- Invite slots now come from the person's plan (null = unlimited).
create or replace function public.invite_slots_total()
returns int
language sql stable security definer
set search_path = public
as $$ select public.feature_quota('invite') $$;

create or replace function public.create_invite()
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  quota int := public.feature_quota('invite');
  t text;
begin
  if not public.can_write() or not public.has_feature('invite') then
    raise exception 'Invites aren''t part of your plan' using errcode = '42501';
  end if;
  if quota is not null and public.invite_slots_used(uid) >= quota then
    raise exception 'All your invite slots are in use' using errcode = '54000';
  end if;
  insert into public.invites (inviter_id) values (uid) returning token into t;
  return t;
end;
$$;

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
  if not public.can_write() or not public.has_feature('request_more') then
    raise exception 'Asking for more room isn''t part of your plan' using errcode = '42501';
  end if;
  select story_id into sid from public.lines where id = p_line and not hidden and status = 'published';
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
  if not public.is_admin() and not (
       exists (select 1 from public.stories where id = r.story_id and author_id = auth.uid())
       and public.has_feature('review_requests')) then
    raise exception 'Only the story''s starter (on a plan that includes it) or an admin can review this' using errcode = '42501';
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

-- Story rules: admins, or the starter on a plan with story_rules.
create or replace function public.set_story_limits(p_story uuid, p_max_branches int, p_max_depth int)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() and not (
       exists (select 1 from public.stories where id = p_story and author_id = auth.uid())
       and public.has_feature('story_rules')) then
    raise exception 'Setting story rules isn''t part of your plan' using errcode = '42501';
  end if;
  update public.stories set max_branches_override = p_max_branches, max_depth_override = p_max_depth where id = p_story;
  if not found then raise exception 'Story not found'; end if;
end;
$$;

create or replace function public.set_story_moderation(p_story uuid, p_auto_approve boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
declare old_v boolean;
begin
  if not public.can_review_story(p_story) then
    raise exception 'Approval settings aren''t part of your plan' using errcode = '42501';
  end if;
  select auto_approve_override into old_v from public.stories where id = p_story for update;
  if not found then raise exception 'Story not found'; end if;
  update public.stories set auto_approve_override = p_auto_approve where id = p_story;
  perform public.log_activity('story.moderation_changed', p_story, null, null,
    jsonb_build_object('from', old_v, 'to', p_auto_approve));
end;
$$;

-- Lines with pending children can't be marked as an ending.
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
  if l.status <> 'published' then raise exception 'Only published lines can be an ending' using errcode = '23514'; end if;
  if exists (select 1 from public.lines c where c.parent_id = l.id and c.status <> 'rejected') then
    raise exception 'Only a line with no continuations can be an ending' using errcode = '23514';
  end if;
  update public.lines set is_complete = true where id = p_line;
  update public.stories set finished = true where id = l.story_id;
end;
$$;

---------------------------------------------------------------------------
-- Settings (site-wide auto-approve replaces the old invite_slots setting)
---------------------------------------------------------------------------

drop function public.update_settings(int, int, int, int);
create or replace function public.update_settings(
  p_max_branches int, p_max_depth int, p_lines_per_hour int, p_auto_approve boolean
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
    auto_approve = coalesce(p_auto_approve, true),
    updated_at = now(),
    updated_by = auth.uid()
  where id;
end;
$$;

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
    'auto_approve', jsonb_build_array(old.auto_approve, new.auto_approve)));
  return null;
end;
$$;

---------------------------------------------------------------------------
-- Plan administration
---------------------------------------------------------------------------

create or replace function public.admin_set_plan(p_handle text, p_plan text, p_expires_at timestamptz default null)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if not exists (select 1 from public.plans where id = p_plan) then raise exception 'No such plan'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'Pick an end date in the future' using errcode = '22023'; end if;
  update public.profiles set plan_id = p_plan, plan_expires_at = p_expires_at where handle = lower(p_handle);
  if not found then raise exception 'No user with that handle'; end if;
end;
$$;

-- Saves a plan's details and its whole feature list in one go.
-- p_features: {"vote": {"enabled": true, "quota": null}, …}
create or replace function public.admin_save_plan(
  p_plan text, p_name text, p_description text, p_price_inr int, p_active boolean, p_features jsonb
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  f text;
  q int;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_plan = 'free' and not p_active then raise exception 'The Free plan can''t be switched off' using errcode = '22023'; end if;
  update public.plans set name = trim(p_name), description = nullif(trim(p_description), ''), price_inr = p_price_inr, active = p_active
  where id = p_plan;
  if not found then raise exception 'No such plan'; end if;
  if jsonb_typeof(p_features) <> 'object' then raise exception 'Invalid features' using errcode = '22023'; end if;
  for f in select jsonb_object_keys(p_features) loop
    if not (f = any (public.feature_names())) then raise exception 'Unknown feature %', f using errcode = '22023'; end if;
    q := case when jsonb_typeof(p_features -> f -> 'quota') = 'number' then (p_features -> f ->> 'quota')::int end;
    insert into public.plan_features (plan_id, feature, enabled, quota)
    values (p_plan, f, coalesce((p_features -> f ->> 'enabled')::boolean, false), q)
    on conflict (plan_id, feature) do update set enabled = excluded.enabled, quota = excluded.quota;
  end loop;
  perform public.log_activity('plan.updated', null, null, null, jsonb_build_object('plan', p_plan, 'name', p_name));
end;
$$;

-- Plan changes join role changes in the activity log.
create or replace function public.audit_profiles()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity (actor_id, action, subject_id) values (new.id, 'user.joined', new.id);
    return null;
  end if;
  if new.role is distinct from old.role then
    perform public.log_activity('user.role_changed', null, null, new.id, jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  if new.plan_id is distinct from old.plan_id or new.plan_expires_at is distinct from old.plan_expires_at then
    perform public.log_activity('user.plan_changed', null, null, new.id,
      jsonb_build_object('from', old.plan_id, 'to', new.plan_id, 'expires_at', new.plan_expires_at));
  end if;
  return null;
end;
$$;
drop trigger audit_profiles on public.profiles;
create trigger audit_profiles after insert or update of role, plan_id, plan_expires_at on public.profiles
  for each row execute function public.audit_profiles();

---------------------------------------------------------------------------
-- Dashboard read models (new columns go at the end)
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
  (select coalesce(max(l.depth), 0) + 1 from public.lines l where l.story_id = s.id and l.status = 'published') as longest_path,
  (select count(*) from public.limit_requests r where r.story_id = s.id and r.status = 'pending')::int as pending_requests,
  s.auto_approve_override,
  coalesce(s.auto_approve_override, a.auto_approve) as effective_auto_approve,
  (select count(*) from public.lines l where l.story_id = s.id and (l.status = 'pending' or l.pending_text is not null))::int as pending_lines
from public.stories s
join public.profiles p on p.id = s.author_id
cross join public.app_settings a;

-- Runs with the owner's rights (it reads plan columns ordinary users can't), so it filters to admins itself.
drop view public.dashboard_users;
create view public.dashboard_users
as
select
  p.id, p.handle, p.display_name, p.avatar_url, p.role, p.created_at,
  inv.handle as invited_by_handle,
  (select count(*) from public.lines l where l.author_id = p.id and l.parent_id is not null)::int as lines_written,
  (select count(*) from public.stories s where s.author_id = p.id)::int as stories_started,
  (select max(a.created_at) from public.activity a where a.actor_id = p.id) as last_active,
  p.plan_id,
  p.plan_expires_at,
  p.onboarded
from public.profiles p
left join public.profiles inv on inv.id = p.invited_by
where public.is_admin();

revoke all on public.dashboard_users from anon;
grant select on public.dashboard_users to authenticated;

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
    'plans', case when admin then (select jsonb_object_agg(plan_id, n) from (select plan_id, count(*) n from public.profiles group by plan_id) x) end,
    'stories_active', (select count(*) from public.stories where status = 'active' and (admin or author_id = uid)),
    'stories_inactive', (select count(*) from public.stories where status = 'inactive' and (admin or author_id = uid)),
    'lines_7d', (select count(*) from public.lines l join public.stories s on s.id = l.story_id
                 where l.created_at > now() - interval '7 days' and l.parent_id is not null and l.status = 'published' and (admin or s.author_id = uid)),
    'pending_requests', (select count(*) from public.limit_requests r join public.stories s on s.id = r.story_id
                         where r.status = 'pending' and (admin or s.author_id = uid)),
    'my_pending_requests', (select count(*) from public.limit_requests where status = 'pending' and requester_id = uid),
    'pending_lines', (select count(*) from public.lines l join public.stories s on s.id = l.story_id
                      where (l.status = 'pending' or l.pending_text is not null) and (admin or s.author_id = uid)),
    'my_pending_lines', (select count(*) from public.lines where author_id = uid and (status = 'pending' or pending_text is not null)),
    'open_reports', case when admin then (select count(distinct line_id) from public.reports where not resolved) end
  );
end;
$$;

---------------------------------------------------------------------------
-- Storage: people can remove their own avatar files
---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute $p$create policy "Users delete their own avatar" on storage.objects
      for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    -- Only processed WebP images up to 512 KB are accepted.
    update storage.buckets set file_size_limit = 524288, allowed_mime_types = array['image/webp'] where id = 'avatars';
  end if;
end $$;

---------------------------------------------------------------------------
-- Function access
---------------------------------------------------------------------------

revoke execute on function public.complete_onboarding(text, text) from public, anon;
revoke execute on function public.set_avatar_url(text) from public, anon;
revoke execute on function public.review_line(uuid, boolean, text) from public, anon;
revoke execute on function public.edit_line(uuid, text) from public, anon;
revoke execute on function public.set_story_moderation(uuid, boolean) from public, anon;
revoke execute on function public.update_settings(int, int, int, boolean) from public, anon;
revoke execute on function public.admin_set_plan(text, text, timestamptz) from public, anon;
revoke execute on function public.admin_save_plan(text, text, text, int, boolean, jsonb) from public, anon;
revoke execute on function public.my_entitlements() from public, anon;
revoke execute on function public.lines_after_status() from public, anon, authenticated;

grant execute on function public.complete_onboarding(text, text) to authenticated;
grant execute on function public.set_avatar_url(text) to authenticated;
grant execute on function public.review_line(uuid, boolean, text) to authenticated;
grant execute on function public.edit_line(uuid, text) to authenticated;
grant execute on function public.set_story_moderation(uuid, boolean) to authenticated;
grant execute on function public.update_settings(int, int, int, boolean) to authenticated;
grant execute on function public.admin_set_plan(text, text, timestamptz) to authenticated;
grant execute on function public.admin_save_plan(text, text, text, int, boolean, jsonb) to authenticated;
grant execute on function public.my_entitlements() to authenticated;
-- check_rate_limit and handle_available are called by the app's server (signed in or not).
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;
grant execute on function public.handle_available(text) to anon, authenticated;

-- Realtime is no longer used (pages poll through the app's server instead).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime drop table public.lines;
      alter publication supabase_realtime drop table public.stories;
    exception when others then null;
    end;
  end if;
end $$;

-- Column-level privileges: plan details are private, and only a few columns are editable.
revoke select, insert, update, delete on public.profiles from anon, authenticated;
grant select (id, handle, display_name, bio, avatar_url, role, invited_by, created_at, onboarded) on public.profiles to anon, authenticated;
grant update (handle, display_name, bio) on public.profiles to authenticated;

-- Anyone who signed up before this migration has already chosen a handle.
update public.profiles set onboarded = true;
