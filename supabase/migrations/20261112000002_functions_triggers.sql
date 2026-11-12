-- Triggers and SQL functions. These replace background jobs and a separate API server.
--
-- A note on security definer: the counter triggers update rows that the signed-in
-- user isn't allowed to touch directly (a reader can't update `lines`), so they run
-- as the function owner. Each one sets an explicit search_path.

---------------------------------------------------------------------------
-- Helpers
---------------------------------------------------------------------------

create or replace function public.my_role()
returns public.user_role
language sql stable security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.can_write()
returns boolean
language sql stable security definer
set search_path = public
as $$ select coalesce(public.my_role() in ('author', 'admin'), false) $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$ select coalesce(public.my_role() = 'admin', false) $$;

-- Lines written by a user in the last hour (used by the rate limit).
create or replace function public.lines_last_hour(uid uuid)
returns int
language sql stable security definer
set search_path = public
as $$
  select count(*)::int from public.lines
  where author_id = uid and created_at > now() - interval '1 hour'
$$;

-- Requests from the app run as the `anon` or `authenticated` database roles.
-- Security-definer functions run as their owner instead.
create or replace function public.is_api_request()
returns boolean
language sql stable
as $$ select current_user in ('anon', 'authenticated') $$;

---------------------------------------------------------------------------
-- New user → profile
---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(split_part(coalesce(new.email, 'reader'), '@', 1), '[^a-zA-Z0-9_.]', '', 'g'));
  base := left(base, 18);
  if char_length(base) < 3 then base := base || 'reader'; end if;
  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate) loop
    n := n + 1;
    candidate := base || floor(random() * 9000 + 1000)::int::text;
    exit when n > 20;
  end loop;

  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', candidate),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own profile, but never their role or who invited them.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
as $$
begin
  if public.is_api_request()
     and (new.role is distinct from old.role or new.invited_by is distinct from old.invited_by or new.id is distinct from old.id) then
    raise exception 'You cannot change your role or invite chain' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

---------------------------------------------------------------------------
-- Lines: path, depth and counters
---------------------------------------------------------------------------

-- Runs as the caller (not security definer) so is_api_request() can tell an app
-- request apart from create_story().
create or replace function public.lines_before_insert()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
declare
  parent public.lines;
begin
  -- Never trust these from the client.
  new.up := 0;
  new.down := 0;
  new.children := 0;
  new.is_complete := false;
  new.hidden := false;
  new.created_at := now();

  if new.parent_id is null then
    -- Root lines are only created through create_story().
    if public.is_api_request() then
      raise exception 'Use create_story() to start a story' using errcode = '42501';
    end if;
    new.path := text2ltree(public.ltree_label(new.id));
    new.depth := 0;
  else
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
    new.path := parent.path || text2ltree(public.ltree_label(new.id));
    new.depth := parent.depth + 1;
  end if;
  return new;
end;
$$;

create trigger lines_before_insert
  before insert on public.lines
  for each row execute function public.lines_before_insert();

create or replace function public.lines_after_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.parent_id is not null then
    update public.lines set children = children + 1 where id = new.parent_id;
  end if;
  update public.stories set line_count = line_count + 1 where id = new.story_id;
  return null;
end;
$$;

create trigger lines_after_insert
  after insert on public.lines
  for each row execute function public.lines_after_insert();

---------------------------------------------------------------------------
-- Votes → line and story counters
---------------------------------------------------------------------------

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

create trigger votes_counter
  after insert or update or delete on public.votes
  for each row execute function public.votes_counter();

---------------------------------------------------------------------------
-- Reports → auto-hide on the third open report
---------------------------------------------------------------------------

create or replace function public.reports_autohide()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (select count(*) from public.reports where line_id = new.line_id and not resolved) >= 3 then
    update public.lines set hidden = true where id = new.line_id;
  end if;
  return null;
end;
$$;

create trigger reports_autohide
  after insert on public.reports
  for each row execute function public.reports_autohide();

---------------------------------------------------------------------------
-- Story creation
---------------------------------------------------------------------------

create or replace function public.slugify(t text)
returns text
language sql immutable
as $$
  select trim(both '-' from left(regexp_replace(lower(t), '[^a-z0-9]+', '-', 'g'), 60))
$$;

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
begin
  if uid is null then
    raise exception 'Sign in to start a story' using errcode = '42501';
  end if;
  if not public.can_write() then
    raise exception 'Only verified authors can start stories' using errcode = '42501';
  end if;
  if public.lines_last_hour(uid) >= 10 then
    raise exception 'You have written 10 lines in the last hour. Take a breath and try again soon.' using errcode = '54000';
  end if;

  s := public.slugify(p_title);
  if s = '' then s := 'story'; end if;
  s := s || '-' || left(replace(sid::text, '-', ''), 6);

  insert into public.stories (id, slug, title, genre, author_id)
  values (sid, s, trim(p_title), p_genre, uid);

  insert into public.lines (id, story_id, parent_id, author_id, text, path)
  values (lid, sid, null, uid, trim(p_first_line), text2ltree(public.ltree_label(lid)));

  update public.stories set root_line_id = lid where id = sid;

  -- Authors follow their own stories.
  insert into public.follows (user_id, story_id) values (uid, sid) on conflict do nothing;

  return s;
end;
$$;

---------------------------------------------------------------------------
-- Tree queries (ltree)
---------------------------------------------------------------------------

-- Breadcrumb and "Read full story from here": every ancestor, root first.
create or replace function public.line_ancestors(p_line uuid)
returns setof public.lines
language sql stable
set search_path = public, extensions
as $$
  select l.* from public.lines l
  where l.path @> (select path from public.lines where id = p_line)
  order by l.depth
$$;

-- Tree map: the subtree under a line, a few levels deep.
create or replace function public.line_subtree(p_line uuid, p_levels int default 4)
returns setof public.lines
language sql stable
set search_path = public, extensions
as $$
  with node as (select path, depth from public.lines where id = p_line)
  select l.* from public.lines l, node
  where l.path <@ node.path
    and l.depth <= node.depth + least(greatest(p_levels, 1), 8)
  order by l.depth, l.score desc, l.created_at
  limit 400
$$;

---------------------------------------------------------------------------
-- Endings
---------------------------------------------------------------------------

-- The story's starter can mark a leaf line as a finished ending.
create or replace function public.mark_complete(p_line uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  l public.lines;
  starter uuid;
begin
  select * into l from public.lines where id = p_line;
  if not found then raise exception 'Line not found'; end if;
  select author_id into starter from public.stories where id = l.story_id;
  if starter is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Only the story''s starter can mark an ending' using errcode = '42501';
  end if;
  if l.children > 0 then
    raise exception 'Only a line with no continuations can be an ending' using errcode = '23514';
  end if;
  update public.lines set is_complete = true where id = p_line;
  update public.stories set finished = true where id = l.story_id;
end;
$$;

---------------------------------------------------------------------------
-- Invites
---------------------------------------------------------------------------

create or replace function public.invite_slots_total()
returns int
language sql immutable
as $$ select 3 $$;

-- Slots in use: accepted invites plus unexpired pending ones.
create or replace function public.invite_slots_used(uid uuid)
returns int
language sql stable security definer
set search_path = public
as $$
  select count(*)::int from public.invites
  where inviter_id = uid and (used_by is not null or expires_at > now())
$$;

create or replace function public.create_invite()
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t text;
begin
  if not public.can_write() then
    raise exception 'Only verified authors can invite' using errcode = '42501';
  end if;
  if not public.is_admin() and public.invite_slots_used(uid) >= public.invite_slots_total() then
    raise exception 'All your invite slots are in use' using errcode = '54000';
  end if;
  insert into public.invites (inviter_id) values (uid) returning token into t;
  return t;
end;
$$;

-- Returns: 'accepted', 'already_author', 'own_invite', 'used', 'expired' or 'invalid'.
create or replace function public.accept_invite(p_token text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv public.invites;
begin
  if uid is null then
    raise exception 'Sign in to accept an invite' using errcode = '42501';
  end if;
  select * into inv from public.invites where token = p_token for update;
  if not found then return 'invalid'; end if;
  if inv.inviter_id = uid then return 'own_invite'; end if;
  if inv.used_by is not null then
    return case when inv.used_by = uid then 'already_author' else 'used' end;
  end if;
  if inv.expires_at <= now() then return 'expired'; end if;
  if public.can_write() then return 'already_author'; end if;

  update public.invites set used_by = uid, used_at = now() where token = p_token;
  update public.profiles set role = 'author', invited_by = inv.inviter_id where id = uid;
  return 'accepted';
end;
$$;

-- Public preview of an invite (who sent it, is it still valid) without exposing the table.
create or replace function public.invite_preview(p_token text)
returns table (inviter_handle text, status text)
language sql stable security definer
set search_path = public
as $$
  select p.handle,
    case
      when i.used_by is not null then 'used'
      when i.expires_at <= now() then 'expired'
      else 'valid'
    end
  from public.invites i join public.profiles p on p.id = i.inviter_id
  where i.token = p_token
$$;

---------------------------------------------------------------------------
-- Admin
---------------------------------------------------------------------------

create or replace function public.admin_set_hidden(p_line uuid, p_hidden boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  update public.lines set hidden = p_hidden where id = p_line;
  update public.reports set resolved = true where line_id = p_line;
end;
$$;

create or replace function public.admin_set_role(p_handle text, p_role public.user_role)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  update public.profiles set role = p_role where handle = lower(p_handle);
  if not found then raise exception 'No user with that handle'; end if;
end;
$$;

---------------------------------------------------------------------------
-- Views
---------------------------------------------------------------------------

-- Homepage feed. Trending = activity with time decay, computed on read.
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
left join public.lines r on r.id = s.root_line_id;

-- Profile numbers: karma, lines written, stories started, stories followed.
create or replace view public.profile_stats
with (security_invoker = true)
as
select
  p.id, p.handle,
  coalesce((select sum(l.up - l.down) from public.lines l where l.author_id = p.id), 0)::int as karma,
  (select count(*) from public.lines l where l.author_id = p.id)::int as lines_written,
  (select count(*) from public.stories s where s.author_id = p.id)::int as stories_started,
  (select count(*) from public.follows f where f.user_id = p.id)::int as following
from public.profiles p;
