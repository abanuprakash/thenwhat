-- Then What: database schema
-- Tables: profiles, stories, lines, votes, follows, invites, reports

create schema if not exists extensions;
create extension if not exists ltree with schema extensions;

create type public.user_role as enum ('reader', 'author', 'admin');

-- Lower bound of the Wilson score interval: ranks lines by up/down votes
-- without letting a line with 1 upvote beat one with 300 up and 20 down.
create or replace function public.wilson_score(up int, down int)
returns double precision
language sql immutable parallel safe
as $$
  select case when up + down = 0 then 0
  else (
    (up::float8 / (up + down)) + 1.96^2 / (2 * (up + down))
    - 1.96 * sqrt(((up::float8 / (up + down)) * (1 - up::float8 / (up + down)) + 1.96^2 / (4 * (up + down))) / (up + down))
  ) / (1 + 1.96^2 / (up + down))
  end
$$;

-- ltree labels allow only letters, digits and underscores, so a uuid's
-- hyphens are swapped for underscores.
create or replace function public.ltree_label(id uuid)
returns text
language sql immutable parallel safe
as $$ select replace(id::text, '-', '_') $$;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_.]{3,24}$'),
  display_name text check (char_length(display_name) <= 60),
  bio text check (char_length(bio) <= 280),
  avatar_url text,
  role public.user_role not null default 'reader',
  invited_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null check (char_length(title) between 1 and 120),
  genre text not null default 'Literary'
    check (genre in ('Sci-fi', 'Mystery', 'Fantasy', 'Drama', 'Literary', 'Horror', 'Comedy')),
  author_id uuid not null references public.profiles on delete cascade,
  root_line_id uuid,
  line_count int not null default 0,
  vote_count int not null default 0,
  finished boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.lines (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories on delete cascade,
  parent_id uuid references public.lines on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  text text not null check (char_length(text) between 1 and 280),
  path extensions.ltree not null,
  depth int not null default 0,
  up int not null default 0,
  down int not null default 0,
  score double precision generated always as (public.wilson_score(up, down)) stored,
  children int not null default 0,
  is_complete boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.stories
  add constraint stories_root_line_fk foreign key (root_line_id) references public.lines on delete set null;

create table public.votes (
  user_id uuid not null references public.profiles on delete cascade,
  line_id uuid not null references public.lines on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (user_id, line_id)
);

create table public.follows (
  user_id uuid not null references public.profiles on delete cascade,
  story_id uuid not null references public.stories on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, story_id)
);

create table public.invites (
  token text primary key default replace(gen_random_uuid()::text, '-', ''),
  inviter_id uuid not null references public.profiles on delete cascade,
  used_by uuid references public.profiles on delete set null,
  used_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

create table public.reports (
  line_id uuid not null references public.lines on delete cascade,
  reporter_id uuid not null references public.profiles on delete cascade,
  reason text check (char_length(reason) <= 280),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (line_id, reporter_id)
);

create index lines_path_gist on public.lines using gist (path);
create index lines_parent_rank on public.lines (parent_id, score desc, created_at desc);
create index lines_author_recent on public.lines (author_id, created_at desc);
create index stories_created on public.stories (created_at desc);
create index invites_inviter on public.invites (inviter_id);
create index reports_open on public.reports (line_id) where not resolved;
