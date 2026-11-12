-- Tests for branch/depth limits, limit-increase requests, story status, settings and the activity log.

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

create function pg_temp.as_user(handle text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', (select id::text from public.profiles p where p.handle = as_user.handle), false);
end $$;
grant execute on function pg_temp.as_user(text) to anon, authenticated;

-- Writes one line under the line with the given text, as the current user.
create function pg_temp.write(parent_text text, new_text text) returns void language plpgsql as $$
begin
  insert into public.lines (story_id, parent_id, author_id, text, path)
  select story_id, id, auth.uid(), new_text, 'x' from public.lines where text = parent_text;
end $$;
grant execute on function pg_temp.write(text, text) to authenticated;

insert into auth.users (id, email) values
  ('e0000000-0000-0000-0000-000000000001', 'erin@example.com'),
  ('f0000000-0000-0000-0000-000000000002', 'finn@example.com'),
  ('90000000-0000-0000-0000-000000000003', 'gail@example.com'),
  ('80000000-0000-0000-0000-000000000004', 'hank@example.com');
update public.profiles set role = 'admin' where handle = 'erin';
update public.profiles set role = 'author', plan_id = 'author' where handle in ('finn', 'gail');

------------------------------------------------------------------ settings
select pg_temp.as_user('finn');
set role authenticated;
select pg_temp.expect_fail($$ select public.update_settings(2, 3, 50, true) $$, 'author changes settings');
update public.app_settings set max_depth = 2;  -- silently matches no rows (no update policy)
do $$ begin assert (select max_depth from public.app_settings) is null, 'settings unchanged'; end $$;
reset role;

select pg_temp.as_user('erin');
set role authenticated;
select pg_temp.expect_fail($$ select public.update_settings(0, 3, 50, true) $$, 'zero branches rejected');
select public.update_settings(2, 3, 50, true);
do $$ begin
  assert (select max_branches_per_line from public.app_settings) = 2, 'branches set';
  assert (select max_depth from public.app_settings) = 3, 'depth set';
end $$;
select pg_temp.expect_fail($$ select public.admin_set_role('erin', 'reader') $$, 'admin demotes self');
reset role;

------------------------------------------------------------------ branch and depth limits
select pg_temp.as_user('finn');
set role authenticated;
select public.create_story('Limits', 'Drama', 'A');
reset role;

select pg_temp.as_user('gail');
set role authenticated;
select pg_temp.write('A', 'A1');
select pg_temp.write('A', 'A2');
select pg_temp.expect_fail($$ select pg_temp.write('A', 'A3') $$, 'third branch over limit of 2');
select pg_temp.write('A1', 'A11');
select pg_temp.write('A1', 'A12');
select pg_temp.expect_fail($$ select pg_temp.write('A11', 'A111') $$, 'fourth line over depth limit of 3');
do $$
declare c record;
begin
  select * into c from public.line_capacity((select id from public.lines where text = 'A'));
  assert c.children = 2 and c.branch_limit = 2 and c.max_depth = 3, 'capacity of A';
end $$;

-- Requests: only when actually at a limit.
select pg_temp.expect_fail($$ select public.request_limit_increase((select id from public.lines where text = 'A2'), 'more_branches', 'Please open this up for me') $$, 'request with room left');
select pg_temp.expect_fail($$ select public.request_limit_increase((select id from public.lines where text = 'A1'), 'more_depth', 'Please open this up for me') $$, 'depth request before the limit');
select pg_temp.expect_fail($$ select public.request_limit_increase((select id from public.lines where text = 'A'), 'more_branches', 'short') $$, 'message too short');
select public.request_limit_increase((select id from public.lines where text = 'A'), 'more_branches', 'I have a great third direction for this.');
select pg_temp.expect_fail($$ select public.request_limit_increase((select id from public.lines where text = 'A'), 'more_branches', 'I have a great third direction for this.') $$, 'duplicate pending request');
select public.request_limit_increase((select id from public.lines where text = 'A11'), 'more_depth', 'This path needs a proper ending.');
select pg_temp.expect_fail($$ select public.decide_limit_request((select id from public.limit_requests where kind = 'more_branches'), true, 1) $$, 'requester approves own');
select pg_temp.expect_fail($$ insert into public.limit_requests (kind, story_id, line_id, requester_id, message) select 'more_branches', story_id, id, auth.uid(), 'sneaky direct insert' from public.lines where text = 'A' $$, 'direct request insert');
update public.limit_requests set status = 'approved';  -- matches no rows (no update policy)
do $$ begin assert (select count(*) from public.limit_requests where status = 'pending') = 2, 'gail sees her 2 requests'; end $$;
reset role;

select pg_temp.as_user('hank');
set role authenticated;
select pg_temp.expect_fail($$ select public.request_limit_increase((select id from public.lines where text = 'A'), 'more_branches', 'Readers cannot ask for this') $$, 'reader requests');
do $$ begin assert (select count(*) from public.limit_requests) = 0, 'reader sees no requests'; end $$;
select pg_temp.expect_fail($$ select public.dashboard_stats() $$, 'reader opens dashboard stats');
reset role;

-- The story's starter reviews requests on their story.
select pg_temp.as_user('finn');
set role authenticated;
do $$ begin assert (select count(*) from public.limit_requests) = 2, 'starter sees requests on their story'; end $$;
select pg_temp.expect_fail($$ select public.decide_limit_request((select id from public.limit_requests where kind = 'more_branches'), true, 0) $$, 'grant 0');
select public.decide_limit_request((select id from public.limit_requests where kind = 'more_branches'), true, 1, 'Go for it');
select public.decide_limit_request((select id from public.limit_requests where kind = 'more_depth'), false, null, 'Not yet');
select pg_temp.expect_fail($$ select public.decide_limit_request((select id from public.limit_requests where kind = 'more_depth'), true, 1) $$, 'decide twice');
select pg_temp.expect_fail($$ select public.set_story_limits((select id from public.stories where title = 'Limits'), 5, 5) $$, 'author sets story limits');
do $$ begin assert (public.dashboard_stats()->>'scope') = 'mine', 'author stats scope'; end $$;
reset role;

select pg_temp.as_user('gail');
set role authenticated;
select pg_temp.write('A', 'A3');
select pg_temp.expect_fail($$ select pg_temp.write('A', 'A4') $$, 'fourth branch after +1');
select pg_temp.expect_fail($$ select pg_temp.write('A11', 'A111') $$, 'depth still limited after rejection');
select public.request_limit_increase((select id from public.lines where text = 'A11'), 'more_depth', 'Asking again with more detail this time.');
select public.request_limit_increase((select id from public.lines where text = 'A'), 'more_branches', 'One more please, I have another idea.');
select public.cancel_limit_request((select id from public.limit_requests where kind = 'more_branches' and status = 'pending'));
do $$ begin assert (select status from public.limit_requests where status = 'cancelled' limit 1) = 'cancelled', 'cancelled'; end $$;
reset role;

-- An admin approves the depth request for every path in the story.
select pg_temp.as_user('erin');
set role authenticated;
select public.decide_limit_request((select id from public.limit_requests where kind = 'more_depth' and status = 'pending'), true, 2);
do $$ begin assert (select max_depth_override from public.stories where title = 'Limits') = 5, 'story depth now 5'; end $$;
reset role;

select pg_temp.as_user('gail');
set role authenticated;
select pg_temp.write('A11', 'A111');
select pg_temp.write('A111', 'A1111');
select pg_temp.expect_fail($$ select pg_temp.write('A1111', 'A11111') $$, 'sixth line over new depth 5');
reset role;

------------------------------------------------------------------ inactivating stories
select pg_temp.as_user('finn');
set role authenticated;
select public.set_story_status((select id from public.stories where title = 'Limits'), 'inactive', 'Taking a break');
do $$ begin assert (select count(*) from public.dashboard_stories where title = 'Limits') = 1, 'starter still sees it'; end $$;
reset role;

select pg_temp.as_user('hank');
set role authenticated;
do $$ begin
  assert not exists (select 1 from public.stories where title = 'Limits'), 'reader cannot see inactive story';
  assert not exists (select 1 from public.lines where text = 'A1'), 'reader cannot see its lines';
  assert not exists (select 1 from public.story_feed where title = 'Limits'), 'not in feed';
  assert not exists (select 1 from public.line_capacity((select id from public.lines where text = 'A'))), 'no capacity leak';
end $$;
select pg_temp.expect_fail($$ insert into public.votes (user_id, line_id, value) values (auth.uid(), (select id from public.lines where text = 'A1'), 1) $$, 'vote on hidden story');
reset role;

-- The vote above found no line id (null), so try with the real id fetched as admin.
select id as a1 from public.lines where text = 'A1' \gset
select pg_temp.as_user('hank');
set role authenticated;
select pg_temp.expect_fail(format($$ insert into public.votes (user_id, line_id, value) values (auth.uid(), %L, 1) $$, :'a1'), 'vote on inactive story line by id');
reset role;

select id as a2, story_id as sid from public.lines where text = 'A2' \gset
select pg_temp.as_user('gail');
set role authenticated;
select pg_temp.expect_fail(format($$ insert into public.lines (story_id, parent_id, author_id, text, path) values (%L, %L, auth.uid(), 'A21', 'x') $$, :'sid', :'a2'), 'write on inactive story');
select pg_temp.expect_fail($$ select public.set_story_status((select id from public.stories where title = 'Limits'), 'active') $$, 'non-owner reactivates');
reset role;

select pg_temp.as_user('finn');
set role authenticated;
select public.set_story_status((select id from public.stories where title = 'Limits'), 'active');
reset role;

-- Admin switches it off; the starter can't switch it back on.
select pg_temp.as_user('erin');
set role authenticated;
select public.set_story_status((select id from public.stories where title = 'Limits'), 'inactive', 'Under review');
select public.set_story_limits((select id from public.stories where title = 'Limits'), 4, null);
reset role;
select pg_temp.as_user('finn');
set role authenticated;
select pg_temp.expect_fail($$ select public.set_story_status((select id from public.stories where title = 'Limits'), 'active') $$, 'starter undoes admin inactivation');
reset role;
select pg_temp.as_user('erin');
set role authenticated;
select public.set_story_status((select id from public.stories where title = 'Limits'), 'active');
do $$ begin
  assert (select effective_max_branches from public.dashboard_stories where title = 'Limits') = 4, 'override applied';
  assert (select effective_max_depth from public.dashboard_stories where title = 'Limits') = 3, 'depth back to site default';
  assert (select pending_requests from public.dashboard_stories where title = 'Limits') = 0, 'no pending';
  assert (select longest_path from public.dashboard_stories where title = 'Limits') = 5, 'longest path';
  assert (select lines_written from public.dashboard_users where handle = 'gail') = 7, 'gail lines';
end $$;
reset role;

------------------------------------------------------------------ activity log
select pg_temp.as_user('erin');
set role authenticated;
do $$
declare actions text[];
begin
  select array_agg(distinct action) into actions from public.activity;
  assert actions @> array['settings.changed', 'story.created', 'line.written', 'request.created', 'request.approved',
    'request.rejected', 'request.cancelled', 'story.inactivated', 'story.reactivated', 'story.limits_changed',
    'line.branch_limit_changed', 'user.joined'], 'logged actions: ' || actions::text;
  assert (select (dashboard_stats()->>'scope')) = 'site', 'admin stats scope';
end $$;
reset role;

select pg_temp.as_user('hank');
set role authenticated;
do $$ begin
  assert (select count(*) from public.activity where actor_id <> auth.uid()) = 0, 'reader sees only own activity';
end $$;
reset role;

select pg_temp.as_user('gail');
set role authenticated;
select pg_temp.expect_fail($$ insert into public.activity (action) values ('fake') $$, 'forge activity');
select pg_temp.expect_fail($$ select public.log_activity('fake') $$, 'call log_activity');
delete from public.activity;
update public.activity set action = 'tampered';
do $$ begin assert (select count(*) from public.activity where action = 'settings.changed') = 0, 'author cannot see settings log'; end $$;
reset role;

reset role;
do $$ begin
  assert not exists (select 1 from public.activity where action = 'tampered'), 'activity cannot be edited';
  assert (select count(*) from public.activity) > 20, 'activity cannot be deleted';
end $$;

-- Put site rules back to "no limit" for anything that runs after this file.
update public.app_settings set max_branches_per_line = null, max_depth = null;
