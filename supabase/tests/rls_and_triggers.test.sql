-- SQL tests for triggers, functions and row-level security.
-- Run with: npm run test:db  (needs Postgres 16 locally)

\set alice '''a0000000-0000-0000-0000-000000000001'''
\set bob   '''b0000000-0000-0000-0000-000000000002'''
\set carol '''c0000000-0000-0000-0000-000000000003'''
\set dave  '''d0000000-0000-0000-0000-000000000004'''

-- Throwaway helper: records that a block failed as expected.
create function pg_temp.expect_fail(sql text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    return;
  end;
  raise exception 'Expected failure but it succeeded: %', label;
end $$;
grant execute on function pg_temp.expect_fail(text, text) to anon, authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  (:alice, 'alice@example.com', '{"full_name":"Alice Admin"}'),
  (:bob,   'bob@example.com',   '{}'),
  (:carol, 'carol@example.com', '{}'),
  (:dave,  'dave@example.com',  '{}');

-- Signup trigger made profiles, everyone starts as a reader.
do $$ begin
  assert (select count(*) from public.profiles) = 4, 'profiles created';
  assert (select count(*) from public.profiles where role = 'reader') = 4, 'all readers';
  assert (select display_name from public.profiles where handle = 'alice') = 'Alice Admin', 'display name';
end $$;

-- A duplicate email prefix still gets a unique handle.
insert into auth.users (email) values ('alice@other.com');
do $$ begin
  assert (select count(*) from public.profiles where handle like 'alice%') = 2, 'unique handle';
end $$;

-- Bootstrap the first admin (what the setup guide tells you to do in the SQL editor).
update public.profiles set role = 'admin' where handle = 'alice';
-- Plans: carol and bob are on Author; dave stays on Free.
update public.profiles set plan_id = 'author' where handle in ('carol', 'bob');

------------------------------------------------------------------ alice (admin)
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
set role authenticated;

select public.create_story('The Last Signal', 'Sci-fi',
  'The signal repeated every eleven seconds, and no one on the bridge could explain why it matched Mara''s heartbeat.');

do $$
declare s public.stories; r public.lines;
begin
  select * into s from public.stories where title = 'The Last Signal';
  assert s.slug like 'the-last-signal-%', 'slug: ' || s.slug;
  select * into r from public.lines where id = s.root_line_id;
  assert r.depth = 0, 'root depth';
  assert position('-' in r.path::text) = 0, 'ltree path has no hyphens';
  assert s.line_count = 1, 'line_count after create';
  assert exists (select 1 from public.follows where story_id = s.id), 'starter follows own story';
end $$;

select public.create_invite() as invite_for_carol \gset

------------------------------------------------------------------ carol (reader)
reset role;
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000003', false);
set role authenticated;

-- Readers can't write.
select pg_temp.expect_fail($$
  insert into public.lines (story_id, parent_id, author_id, text, path)
  select story_id, id, auth.uid(), 'reader line', 'x' from public.lines where depth = 0 limit 1
$$, 'reader inserts line');
select pg_temp.expect_fail($$ select public.create_story('Nope', 'Drama', 'nope') $$, 'reader creates story');
select pg_temp.expect_fail($$ select public.create_invite() $$, 'reader creates invite');

-- Readers can't promote themselves.
select pg_temp.expect_fail($$ update public.profiles set role = 'author' where id = auth.uid() $$, 'self promote');
update public.profiles set bio = 'I like branching stories.' where id = auth.uid();

-- Accept the invite → author.
select public.accept_invite(:'invite_for_carol') = 'accepted' as ok \gset
\if :ok
\else
  \echo 'accept_invite did not return accepted'
  select 1/0;
\endif

do $$ begin
  assert public.my_role() = 'author', 'carol is now author';
  assert (select invited_by from public.profiles where id = auth.uid()) = 'a0000000-0000-0000-0000-000000000001', 'invite chain';
end $$;

-- Root lines only through create_story().
select pg_temp.expect_fail($$
  insert into public.lines (story_id, parent_id, author_id, text, path)
  select id, null, auth.uid(), 'sneaky root', 'x' from public.stories limit 1
$$, 'api root insert');

-- Continue the story. Path and depth come from the parent, whatever the client sends.
insert into public.lines (story_id, parent_id, author_id, text, path, depth, up)
select story_id, id, auth.uid(), '"It''s not a signal," Mara whispered.', 'garbage', 99, 500
from public.lines where depth = 0;

do $$
declare l public.lines; root public.lines;
begin
  select * into root from public.lines where depth = 0;
  select * into l from public.lines where parent_id = root.id;
  assert l.depth = 1, 'child depth';
  assert l.up = 0, 'client cannot set votes';
  assert l.path::text = root.path::text || '.' || replace(l.id::text, '-', '_'), 'child path';
  assert root.children = 1, 'parent children count';
  assert (select line_count from public.stories) = 2, 'story line_count';
end $$;

-- Can't write as someone else.
select pg_temp.expect_fail($$
  insert into public.lines (story_id, parent_id, author_id, text, path)
  select story_id, id, 'a0000000-0000-0000-0000-000000000001', 'impersonation', 'x' from public.lines where depth = 0
$$, 'impersonate author');

-- 280 character limit.
select pg_temp.expect_fail($$
  insert into public.lines (story_id, parent_id, author_id, text, path)
  select story_id, id, auth.uid(), repeat('a', 281), 'x' from public.lines where depth = 0
$$, '281 chars');

-- Rate limit: 10 lines an hour. Carol has 1, so 9 more succeed and the 11th fails.
do $$
begin
  for i in 1..9 loop
    insert into public.lines (story_id, parent_id, author_id, text, path)
    select story_id, id, auth.uid(), 'Branch ' || i, 'x' from public.lines where depth = 0;
  end loop;
end $$;
select pg_temp.expect_fail($$
  insert into public.lines (story_id, parent_id, author_id, text, path)
  select story_id, id, auth.uid(), 'one too many', 'x' from public.lines where depth = 0
$$, 'rate limit');

-- Carol isn't the starter, so she can't mark an ending.
select pg_temp.expect_fail($$
  select public.mark_complete((select id from public.lines where text = 'Branch 9'))
$$, 'non-starter marks complete');

------------------------------------------------------------------ dave (reader)
reset role;
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000004', false);
set role authenticated;

insert into public.votes (user_id, line_id, value)
select auth.uid(), id, 1 from public.lines where text like '"It''s not a signal%';
do $$ begin
  assert (select up from public.lines where text like '"It''s not a signal%') = 1, 'upvote counted';
  assert (select vote_count from public.stories) = 1, 'story vote_count';
  assert (select score from public.lines where text like '"It''s not a signal%') > 0, 'score computed';
end $$;

update public.votes set value = -1 where user_id = auth.uid();
do $$ begin
  assert (select up from public.lines where text like '"It''s not a signal%') = 0, 'up after flip';
  assert (select down from public.lines where text like '"It''s not a signal%') = 1, 'down after flip';
  assert (select vote_count from public.stories) = -1, 'story vote_count after flip';
end $$;

delete from public.votes where user_id = auth.uid();
do $$ begin
  assert (select up + down from public.lines where text like '"It''s not a signal%') = 0, 'vote removed';
end $$;

-- Readers can't update line counts directly, or vote as someone else.
update public.lines set up = 9999;
do $$ begin assert (select max(up) from public.lines) = 0, 'reader cannot update lines'; end $$;
select pg_temp.expect_fail($$
  insert into public.votes (user_id, line_id, value)
  select 'c0000000-0000-0000-0000-000000000003', id, 1 from public.lines limit 1
$$, 'vote as someone else');

-- Follow / unfollow.
insert into public.follows (user_id, story_id) select auth.uid(), id from public.stories;
do $$ begin assert (select count(*) from public.follows) = 1, 'sees only own follows'; end $$;

-- Reports: the third report hides a line.
insert into public.reports (line_id, reporter_id, reason)
select id, auth.uid(), 'spam' from public.lines where text = 'Branch 1';

reset role;
insert into public.reports (line_id, reporter_id, reason)
select id, 'b0000000-0000-0000-0000-000000000002', 'spam' from public.lines where text = 'Branch 1';
do $$ begin assert not (select hidden from public.lines where text = 'Branch 1'), 'two reports: still visible'; end $$;
insert into public.reports (line_id, reporter_id, reason)
select id, 'a0000000-0000-0000-0000-000000000001', 'spam' from public.lines where text = 'Branch 1';
do $$ begin assert (select hidden from public.lines where text = 'Branch 1'), 'three reports: hidden'; end $$;

select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ begin
  assert not exists (select 1 from public.lines where text = 'Branch 1'), 'hidden line invisible to readers';
  assert (select count(*) from public.line_ancestors((select id from public.lines where text = 'Branch 2'))) = 2, 'ancestors';
  assert (select count(*) from public.line_subtree((select id from public.lines where depth = 0), 4)) = 10, 'subtree hides hidden line';
  assert (select count(*) from public.story_feed) = 1, 'feed readable';
end $$;
select pg_temp.expect_fail($$ select public.admin_set_hidden((select id from public.lines limit 1), true) $$, 'reader uses admin fn');

------------------------------------------------------------------ anonymous visitor
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  assert (select count(*) from public.story_feed) = 1, 'anon reads feed';
  assert (select count(*) from public.lines) = 10, 'anon reads visible lines';
end $$;
select pg_temp.expect_fail($$ insert into public.votes (user_id, line_id, value) select gen_random_uuid(), id, 1 from public.lines limit 1 $$, 'anon votes');
select pg_temp.expect_fail($$ select public.create_story('x', 'Drama', 'y') $$, 'anon creates story');

------------------------------------------------------------------ alice (admin)
reset role;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
set role authenticated;

do $$ begin
  assert exists (select 1 from public.lines where text = 'Branch 1'), 'admin sees hidden line';
end $$;
select public.admin_set_hidden((select id from public.lines where text = 'Branch 1'), false);
do $$ begin
  assert not (select hidden from public.lines where text = 'Branch 1'), 'restored';
  assert (select bool_and(resolved) from public.reports), 'reports resolved';
end $$;

-- Mark an ending, then nobody can continue it.
select public.mark_complete((select id from public.lines where text = 'Branch 9'));
do $$ begin
  assert (select is_complete from public.lines where text = 'Branch 9'), 'ending marked';
  assert (select finished from public.stories), 'story finished';
end $$;
select pg_temp.expect_fail($$
  insert into public.lines (story_id, parent_id, author_id, text, path)
  select story_id, id, auth.uid(), 'after the end', 'x' from public.lines where text = 'Branch 9'
$$, 'continue a completed path');
select pg_temp.expect_fail($$
  select public.mark_complete((select id from public.lines where depth = 0))
$$, 'mark a line with children complete');

-- Promote bob through the admin function.
select public.admin_set_role('bob', 'author');

------------------------------------------------------------------ bob (author): invite slots
reset role;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000002', false);
set role authenticated;
select public.create_invite();
select public.create_invite();
select public.create_invite();
select pg_temp.expect_fail($$ select public.create_invite() $$, 'fourth invite slot');
do $$ begin assert (select count(*) from public.invites) = 3, 'bob sees only his invites'; end $$;

-- Own invite can't be accepted; used invite can't be reused.
do $$ begin
  assert public.accept_invite((select token from public.invites limit 1)) = 'own_invite', 'own invite';
end $$;

reset role;
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ begin
  assert public.accept_invite('not-a-token') = 'invalid', 'invalid token';
end $$;
select public.accept_invite(:'invite_for_carol') = 'used' as reused \gset
\if :reused
\else
  \echo 'used invite was accepted twice'
  select 1/0;
\endif

-- Stats view.
do $$ begin
  assert (select lines_written from public.profile_stats where handle = 'carol') = 10, 'carol lines_written';
  assert (select stories_started from public.profile_stats where handle = 'alice') = 1, 'alice stories';
end $$;

reset role;
