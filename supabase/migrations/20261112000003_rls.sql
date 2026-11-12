-- Row-level security: the database itself enforces who can do what.
--
--   Capability                           Reader  Author  Admin
--   Read, navigate, tree map               ✓       ✓       ✓
--   Vote, follow, report                   ✓       ✓       ✓
--   Write lines, start stories, invite     —       ✓       ✓
--   Hide/restore lines, change roles       —       —       ✓

alter table public.profiles enable row level security;
alter table public.stories  enable row level security;
alter table public.lines    enable row level security;
alter table public.votes    enable row level security;
alter table public.follows  enable row level security;
alter table public.invites  enable row level security;
alter table public.reports  enable row level security;

-- Profiles ---------------------------------------------------------------
create policy "Profiles are public"
  on public.profiles for select using (true);

create policy "Users edit their own profile"
  on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Stories (created only through create_story) ----------------------------
create policy "Stories are public"
  on public.stories for select using (true);

-- Lines ------------------------------------------------------------------
create policy "Visible lines are public"
  on public.lines for select
  using (not hidden or author_id = auth.uid() or public.is_admin());

-- Authors and admins can continue a story, at most 10 lines an hour.
create policy "Authors write lines"
  on public.lines for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.can_write()
    and parent_id is not null
    and public.lines_last_hour(auth.uid()) < 10
  );

-- Votes ------------------------------------------------------------------
create policy "Users see their own votes"
  on public.votes for select to authenticated using (user_id = auth.uid());
create policy "Users vote"
  on public.votes for insert to authenticated with check (user_id = auth.uid());
create policy "Users change their vote"
  on public.votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users remove their vote"
  on public.votes for delete to authenticated using (user_id = auth.uid());

-- Follows ----------------------------------------------------------------
create policy "Users see their follows"
  on public.follows for select to authenticated using (user_id = auth.uid());
create policy "Users follow"
  on public.follows for insert to authenticated with check (user_id = auth.uid());
create policy "Users unfollow"
  on public.follows for delete to authenticated using (user_id = auth.uid());

-- Invites (created and accepted through functions) -----------------------
create policy "Inviters see their invites"
  on public.invites for select to authenticated
  using (inviter_id = auth.uid() or public.is_admin());

-- Reports ----------------------------------------------------------------
create policy "Users report lines"
  on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "Reporters and admins see reports"
  on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- Function access ---------------------------------------------------------
revoke execute on function public.create_story(text, text, text) from public, anon;
revoke execute on function public.mark_complete(uuid) from public, anon;
revoke execute on function public.create_invite() from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.admin_set_hidden(uuid, boolean) from public, anon;
revoke execute on function public.admin_set_role(text, public.user_role) from public, anon;
revoke execute on function public.lines_last_hour(uuid) from public, anon;
revoke execute on function public.invite_slots_used(uuid) from public, anon;

grant execute on function public.create_story(text, text, text) to authenticated;
grant execute on function public.mark_complete(uuid) to authenticated;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.admin_set_hidden(uuid, boolean) to authenticated;
grant execute on function public.admin_set_role(text, public.user_role) to authenticated;
grant execute on function public.lines_last_hour(uuid) to authenticated;
grant execute on function public.invite_slots_used(uuid) to authenticated;

-- Live updates: push new lines and vote counts to open pages ------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.lines;
  end if;
end $$;

-- Avatars bucket (Supabase Storage) ---------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
    on conflict (id) do nothing;

    execute $p$create policy "Avatar images are public" on storage.objects
      for select using (bucket_id = 'avatars')$p$;
    execute $p$create policy "Users upload their own avatar" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "Users replace their own avatar" on storage.objects
      for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end $$;
