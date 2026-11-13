-- Query tuning. Same rules, same results, less work per query.
--
-- 1. Indexes for lookups that scanned whole tables (stories by author, the Top feed).
-- 2. Access rules evaluate auth.uid(), is_admin(), has_feature(...) once per query, not once per
--    row: wrapped as (select ...), which Postgres runs once and reuses (Supabase's RLS advice).
-- 3. Reading lines: the story check is an EXISTS on stories instead of a function call per line,
--    so Postgres can look each story up once (memoised) instead of once per line.
-- 4. Trending: stored on stories instead of being recalculated for every story on every feed
--    load. Kept fresh by a trigger when votes or lines change, and every 5 minutes by pg_cron for
--    the time decay.

---------------------------------------------------------------------------
-- 1. Indexes
---------------------------------------------------------------------------

create index if not exists stories_author_recent on public.stories (author_id, created_at desc);
create index if not exists stories_top on public.stories (vote_count desc, line_count desc) where status = 'active';

---------------------------------------------------------------------------
-- 2. Evaluate per-query values once (every policy in public)
---------------------------------------------------------------------------

do $$
declare
  p record;
  q text;
  c text;
  wrap constant text[][] := array[
    -- pattern                                     replacement
    array['\mauth\.uid\(\)',                        '(SELECT auth.uid())'],
    array['\m(public\.)?is_admin\(\)',              '(SELECT public.is_admin())'],
    array['\m(public\.)?can_write\(\)',             '(SELECT public.can_write())'],
    array['\m(public\.)?lines_per_hour\(\)',        '(SELECT public.lines_per_hour())'],
    array['\m(public\.)?has_feature\(([^()]*)\)',   '(SELECT public.has_feature(\2))']
  ];
  i int;
begin
  for p in select * from pg_policies where schemaname = 'public' loop
    q := p.qual;
    c := p.with_check;
    for i in 1 .. array_length(wrap, 1) loop
      if q is not null then q := regexp_replace(q, wrap[i][1], wrap[i][2], 'g'); end if;
      if c is not null then c := regexp_replace(c, wrap[i][1], wrap[i][2], 'g'); end if;
    end loop;
    if q is distinct from p.qual then
      execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, q);
    end if;
    if c is distinct from p.with_check then
      execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, c);
    end if;
  end loop;
end $$;

---------------------------------------------------------------------------
-- 3. Reading lines: same rule as story_visible() + can_manage_story(), written so Postgres can
--    look each story up once per query.
---------------------------------------------------------------------------

drop policy "Visible lines are public" on public.lines;
create policy "Visible lines are public"
  on public.lines for select
  using (
    exists (
      select 1 from public.stories s
      where s.id = lines.story_id
        and (s.status = 'active' or s.author_id = (select auth.uid()) or (select public.is_admin()))
    )
    and (
      (status = 'published' and not hidden)
      or author_id = (select auth.uid())
      or (select public.is_admin())
      or exists (select 1 from public.stories s where s.id = lines.story_id and s.author_id = (select auth.uid()))
    )
  );

---------------------------------------------------------------------------
-- 4. Stored trending score
---------------------------------------------------------------------------

alter table public.stories add column trending_score float8 not null default 0;

create or replace function public.trending_score(p_votes int, p_lines int, p_created timestamptz)
returns float8
language sql stable
as $$
  -- Same formula the feed used before: activity, decaying with age.
  select (greatest(p_votes, 0) + p_lines)::float8 / power(extract(epoch from now() - p_created) / 3600 + 2, 1.5)
$$;

create or replace function public.stories_trending_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.trending_score := public.trending_score(new.vote_count, new.line_count, new.created_at);
  return new;
end;
$$;

create trigger stories_trending_touch
  before insert or update of vote_count, line_count on public.stories
  for each row execute function public.stories_trending_touch();

-- Time decay: everything active, every 5 minutes (pg_cron, below). Runs as the table owner.
create or replace function public.refresh_trending()
returns void
language sql security definer
set search_path = public
as $$
  update public.stories
  set trending_score = public.trending_score(vote_count, line_count, created_at)
  where status = 'active';
$$;
revoke execute on function public.refresh_trending() from public, anon, authenticated;
revoke execute on function public.stories_trending_touch() from public, anon, authenticated;

do $$ begin perform public.refresh_trending(); end $$;

create index if not exists stories_trending on public.stories (trending_score desc) where status = 'active';

create or replace view public.story_feed
with (security_invoker = true)
as
select
  s.id, s.slug, s.title, s.genre, s.finished, s.created_at,
  s.line_count, s.vote_count, s.root_line_id, s.author_id,
  p.handle as author_handle,
  r.text as opening_line,
  s.trending_score
from public.stories s
join public.profiles p on p.id = s.author_id
left join public.lines r on r.id = s.root_line_id
where s.status = 'active';

-- Schedule the refresh with pg_cron when it's available (it is on Supabase; enable it under
-- Database → Extensions if this notice appears, then run this block again).
do $$
begin
  create extension if not exists pg_cron;
  execute $cron$ select cron.schedule('refresh-trending', '*/5 * * * *', 'select public.refresh_trending()') $cron$;
exception when others then
  raise notice 'pg_cron not available (%): trending updates on votes and new lines only', sqlerrm;
end $$;
