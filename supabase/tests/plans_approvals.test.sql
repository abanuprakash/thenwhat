-- Tests for onboarding, plans, line approval, edits, rate limits and input hygiene.

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

create function pg_temp.as_user(h text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', (select id::text from public.profiles p where p.handle = h), false);
end $$;

create function pg_temp.write(parent_text text, new_text text) returns void language plpgsql as $$
begin
  insert into public.lines (story_id, parent_id, author_id, text, path)
  select story_id, id, auth.uid(), new_text, 'x' from public.lines where text = parent_text;
end $$;
grant execute on function pg_temp.write(text, text) to authenticated;

------------------------------------------------------------------ onboarding
insert into auth.users (id, email, raw_user_meta_data) values
  ('a1000000-0000-0000-0000-000000000001', 'ada@example.com', '{"full_name":"Ada Admin"}'),
  ('b1000000-0000-0000-0000-000000000002', 'owen.owner@gmail.com', '{"full_name":"Owen Owner","picture":"https://lh3.googleusercontent.com/a/abc123=s96-c"}'),
  ('c1000000-0000-0000-0000-000000000003', 'pia@example.com', '{"full_name":"Pia","avatar_url":"https://evil.example.com/track.png"}'),
  ('d1000000-0000-0000-0000-000000000004', 'rex@example.com', '{}'),
  ('e1000000-0000-0000-0000-000000000005', 'admin@example.com', '{}');

do $$ begin
  assert (select count(*) from public.profiles where not onboarded) = 5, 'new people start not onboarded';
  assert (select handle from public.profiles where id = 'b1000000-0000-0000-0000-000000000002') = 'owenowner', 'handle from email';
  assert (select display_name from public.profiles where handle = 'owenowner') = 'Owen Owner', 'name from Google';
  assert (select avatar_url from public.profiles where handle = 'owenowner') like 'https://lh3.googleusercontent.com/%', 'Google photo kept';
  assert (select avatar_url from public.profiles where id = 'c1000000-0000-0000-0000-000000000003') is null, 'unknown image host dropped';
  assert (select handle from public.profiles where id = 'e1000000-0000-0000-0000-000000000005') <> 'admin', 'reserved handle not given out';
end $$;

update public.profiles set role = 'admin' where id = 'a1000000-0000-0000-0000-000000000001';
update public.profiles set role = 'author', plan_id = 'author' where id in ('b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003');

select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', false);
set role authenticated;
select pg_temp.expect_fail($$ select public.complete_onboarding('admin', 'Owen') $$, 'reserved handle');
select pg_temp.expect_fail($$ select public.complete_onboarding('o..wen', 'Owen') $$, 'double dot');
select pg_temp.expect_fail($$ select public.complete_onboarding('_owen', 'Owen') $$, 'leading underscore');
select pg_temp.expect_fail($$ select public.complete_onboarding('ada', 'Owen') $$, 'taken handle');
select pg_temp.expect_fail($$ select public.complete_onboarding('owen', '') $$, 'empty name');
select pg_temp.expect_fail($$ select public.complete_onboarding('owen', 'Ow' || chr(8238) || 'en') $$, 'bidi override in name');
do $$ begin
  assert public.handle_available('owen'), 'owen free';
  assert not public.handle_available('ada'), 'ada taken';
  assert not public.handle_available('support'), 'reserved';
end $$;
select public.complete_onboarding('Owen', 'Owen Owner');
do $$ begin
  assert (select handle from public.profiles where id = auth.uid()) = 'owen', 'handle saved lowercase';
  assert (select onboarded from public.profiles where id = auth.uid()), 'onboarded';
end $$;

-- Protected columns can't be changed or even read directly.
select pg_temp.expect_fail($$ update public.profiles set plan_id = 'author_pro' where id = auth.uid() $$, 'self upgrade');
select pg_temp.expect_fail($$ update public.profiles set avatar_url = 'https://evil.example.com/x.png' where id = auth.uid() $$, 'avatar direct');
select pg_temp.expect_fail($$ update public.profiles set onboarded = false where id = auth.uid() $$, 'onboarded direct');
select pg_temp.expect_fail($$ select plan_id from public.profiles $$, 'read plans of others');
select pg_temp.expect_fail($$ select public._has_feature('vote', 'a1000000-0000-0000-0000-000000000001') $$, 'probe another user''s plan');
select pg_temp.expect_fail($$ select public.set_avatar_url('https://evil.example.com/x.png') $$, 'external avatar');
select pg_temp.expect_fail($$ select public.set_avatar_url('/media/avatars/a1000000-0000-0000-0000-000000000001/0b0b0b0b-0000-4000-8000-000000000000.webp') $$, 'someone else''s avatar path');
select public.set_avatar_url('/media/avatars/b1000000-0000-0000-0000-000000000002/0b0b0b0b-0000-4000-8000-000000000000.webp');
select public.set_avatar_url(null);
do $$ begin
  assert (select count(*) from public.dashboard_users) = 0, 'authors see no user list';
  assert (public.my_entitlements() -> 'features' -> 'start_stories' ->> 'quota')::int = 3, 'author quota visible to self';
end $$;
reset role;

------------------------------------------------------------------ plans
-- Owen (Author plan) starts stories up to his quota of 3.
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', false);
set role authenticated;
select public.create_story('Root A', 'Drama', 'A');
select public.create_story('Two', 'Drama', 'Two');
select public.create_story('Three', 'Drama', 'Three');
select pg_temp.expect_fail($$ select public.create_story('Four', 'Drama', 'Four') $$, 'story quota');
-- Text hygiene in lines.
select pg_temp.expect_fail($$ select pg_temp.write('A', 'zero' || chr(8203) || 'width') $$, 'zero-width character');
select pg_temp.expect_fail($$ select pg_temp.write('A', 'bell' || chr(7)) $$, 'control character');
reset role;

-- Rex: verified author but on Free, so can vote but not write.
update public.profiles set role = 'author' where id = 'd1000000-0000-0000-0000-000000000004';
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000004', false);
set role authenticated;
select pg_temp.expect_fail($$ select pg_temp.write('A', 'Rex writes') $$, 'free plan writes');
select pg_temp.expect_fail($$ select public.create_invite() $$, 'free plan invites');
insert into public.votes (user_id, line_id, value) select auth.uid(), id, 1 from public.lines where text = 'A';
reset role;

-- An admin switches voting off for Free: Rex can't vote any more.
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', false);
set role authenticated;
select pg_temp.expect_fail($$ select public.admin_save_plan('free', 'Free', null, 0, true, '{"hack": {"enabled": true}}') $$, 'unknown feature');
select pg_temp.expect_fail($$ select public.admin_save_plan('free', 'Free', null, 0, false, '{}') $$, 'switch off free');
select public.admin_save_plan('free', 'Free', 'Read and follow.', 0, true, '{"vote": {"enabled": false, "quota": null}}');
select pg_temp.expect_fail($$ select public.admin_set_plan('rex', 'author', now() - interval '1 day') $$, 'expiry in the past');
do $$ begin assert (select count(*) from public.dashboard_users) = 5, 'admin sees everyone'; end $$;
reset role;

select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000004', false);
set role authenticated;
select pg_temp.expect_fail($$ insert into public.votes (user_id, line_id, value) select auth.uid(), id, 1 from public.lines where text = 'Two' $$, 'vote after feature off');
select pg_temp.expect_fail($$ select public.admin_save_plan('free', 'Free', null, 0, true, '{"vote": {"enabled": true}}') $$, 'non-admin edits plans');
reset role;

-- A plan that has expired falls back to Free.
update public.profiles set plan_id = 'author', plan_expires_at = now() - interval '1 minute' where id = 'd1000000-0000-0000-0000-000000000004';
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ begin assert public.effective_plan() = 'free', 'expired plan is free'; end $$;
select pg_temp.expect_fail($$ select pg_temp.write('A', 'Expired writer') $$, 'expired plan writes');
reset role;
update public.profiles set plan_expires_at = now() + interval '30 days' where id = 'd1000000-0000-0000-0000-000000000004';

------------------------------------------------------------------ approvals
-- Site default: lines need approval.
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', false);
set role authenticated;
select public.update_settings(2, null, 50, false);
reset role;

-- Pia (Author plan, not the starter) writes: it waits for approval.
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', false);
set role authenticated;
select pg_temp.write('A', 'A1 by Pia');
do $$ begin
  assert (select status from public.lines where text = 'A1 by Pia') = 'pending', 'pending';
  assert (select children from public.lines where text = 'A') = 0, 'pending not counted';
end $$;
select pg_temp.expect_fail($$ select pg_temp.write('A1 by Pia', 'under pending') $$, 'continue a pending line');
select pg_temp.expect_fail($$ insert into public.votes (user_id, line_id, value) select auth.uid(), id, 1 from public.lines where text = 'A1 by Pia' $$, 'vote on pending');
reset role;

-- Rex (reader view) can't see it.
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ begin assert not exists (select 1 from public.lines where text = 'A1 by Pia'), 'pending hidden from others'; end $$;
-- Rex is now on Author until next month: his line waits too, and it takes the second branch slot.
select pg_temp.write('A', 'A2 by Rex');
select pg_temp.expect_fail($$ select pg_temp.write('A', 'A3 over the limit') $$, 'pending lines reserve branch slots');
reset role;

-- Owen started the story, so he sees pending lines, and his own lines publish straight away.
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', false);
set role authenticated;
do $$ begin assert exists (select 1 from public.lines where text = 'A1 by Pia'), 'starter sees pending'; end $$;
select pg_temp.write('Two', 'Owen continues his own story');
do $$ begin assert (select status from public.lines where text = 'Owen continues his own story') = 'published', 'starter publishes directly'; end $$;
-- On the Author plan he can't approve or change moderation…
select pg_temp.expect_fail($$ select public.review_line((select id from public.lines where text = 'A1 by Pia'), true) $$, 'starter without approvals feature');
select pg_temp.expect_fail($$ select public.set_story_moderation((select id from public.stories where title = 'Root A'), true) $$, 'moderation without feature');
reset role;

-- …so an admin upgrades him to Author Pro.
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', false);
set role authenticated;
select public.admin_set_plan('owen', 'author_pro', null);
reset role;

select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', false);
set role authenticated;
select public.review_line((select id from public.lines where text = 'A1 by Pia'), true, 'Lovely');
select public.review_line((select id from public.lines where text = 'A2 by Rex'), false, 'Doesn''t fit the tone');
select pg_temp.expect_fail($$ select public.review_line((select id from public.lines where text = 'A1 by Pia'), true) $$, 'review twice');
do $$ begin
  assert (select status from public.lines where text = 'A1 by Pia') = 'published', 'approved';
  assert (select children from public.lines where text = 'A') = 1, 'counted after approval';
end $$;
-- Story-level auto-approve beats the site setting.
select public.set_story_moderation((select id from public.stories where title = 'Three'), true);
reset role;

select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', false);
set role authenticated;
select pg_temp.write('Three', 'Pia in an auto-approved story');
do $$ begin
  assert (select status from public.lines where text = 'Pia in an auto-approved story') = 'published', 'story override';
  assert exists (select 1 from public.lines where text = 'A1 by Pia'), 'author sees own published line';
end $$;
reset role;

select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000004', false);
set role authenticated;
do $$ begin
  assert exists (select 1 from public.lines where text = 'A1 by Pia'), 'published line visible';
  assert (select status from public.lines where text = 'A2 by Rex') = 'rejected', 'author sees own rejected line';
  assert (select review_note from public.lines where text = 'A2 by Rex') = 'Doesn''t fit the tone', 'with the note';
end $$;
reset role;

------------------------------------------------------------------ edits
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', false);
set role authenticated;
select public.edit_line((select id from public.lines where text = 'A1 by Pia'), 'A1 by Pia, improved');
do $$ begin
  assert (select text from public.lines where text like 'A1 by Pia%') = 'A1 by Pia', 'published text unchanged until approved';
  assert (select pending_text from public.lines where text = 'A1 by Pia') = 'A1 by Pia, improved', 'edit waiting';
end $$;
select pg_temp.expect_fail($$ select public.edit_line((select id from public.lines where text = 'A'), 'Hijack') $$, 'edit someone else''s line');
reset role;

select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', false);
set role authenticated;
select public.review_line((select id from public.lines where text = 'A1 by Pia'), true);
do $$ begin assert exists (select 1 from public.lines where text = 'A1 by Pia, improved'), 'edit applied'; end $$;
-- A line someone has continued is locked; endings can't be marked over pending lines.
select pg_temp.write('A1 by Pia, improved', 'Owen continues Pia');
reset role;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', false);
set role authenticated;
select pg_temp.expect_fail($$ select public.edit_line((select id from public.lines where text = 'A1 by Pia, improved'), 'Changed again') $$, 'edit a continued line');
select pg_temp.write('Owen continues Pia', 'Pia waits under Owen');
reset role;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', false);
set role authenticated;
select pg_temp.expect_fail($$ select public.mark_complete((select id from public.lines where text = 'Owen continues Pia')) $$, 'ending over a pending line');
do $$ begin assert (public.dashboard_stats() ->> 'pending_lines')::int = 1, 'pending count'; end $$;
reset role;

------------------------------------------------------------------ rate limits and versions
do $$ begin
  assert public.check_rate_limit('test:key', 2, 60), 'hit 1';
  assert public.check_rate_limit('test:key', 2, 60), 'hit 2';
  assert not public.check_rate_limit('test:key', 2, 60), 'hit 3 blocked';
  assert (select version from public.stories where title = 'Root A') > 0, 'version bumps';
end $$;
select pg_temp.expect_fail($$ select public.check_rate_limit(repeat('k', 201), 1, 60) $$, 'oversized key');
