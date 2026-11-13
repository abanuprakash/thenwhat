-- Guided tours: remember which ones each signed-in person has seen, so each shows once per
-- page and role, on any device. Guests keep this in their browser instead.
--
-- Keys look like "reading@author": the page's tour and the role it was written for, so someone
-- who becomes an author later gets the author version once.

alter table public.profiles add column tours_seen text[] not null default '{}';

-- Read together with the rest of your own profile (the app only selects it for the signed-in
-- person). It holds nothing personal, just tour names.
grant select (tours_seen) on public.profiles to authenticated;

create or replace function public.mark_tour_seen(p_key text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_key is null or p_key !~ '^[a-z]{2,20}@(reader|author|admin)$' then
    raise exception 'Unknown tour' using errcode = '22023';
  end if;
  update public.profiles
  set tours_seen = case
      when p_key = any (tours_seen) then tours_seen
      else (array_append(tours_seen, p_key))[greatest(cardinality(tours_seen) - 61, 1):]
    end
  where id = auth.uid();
end;
$$;

create or replace function public.reset_tours()
returns void
language sql security definer
set search_path = public
as $$
  update public.profiles set tours_seen = '{}' where id = auth.uid();
$$;

revoke execute on function public.mark_tour_seen(text) from public, anon;
revoke execute on function public.reset_tours() from public, anon;
grant execute on function public.mark_tour_seen(text) to authenticated;
grant execute on function public.reset_tours() to authenticated;
