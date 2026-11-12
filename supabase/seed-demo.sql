-- Optional demo content: the six stories from the original prototype.
-- Run it in the Supabase SQL editor AFTER you've signed in once and made yourself admin.
-- The stories are credited to the first admin account.

create or replace function pg_temp.add_story(p_title text, p_genre text, p_text text, p_finished boolean default false)
returns uuid language plpgsql as $$
declare
  sid uuid := gen_random_uuid();
  lid uuid := gen_random_uuid();
  uid uuid := current_setting('seed.uid')::uuid;
begin
  insert into public.stories (id, slug, title, genre, author_id, finished)
  values (sid, public.slugify(p_title) || '-' || left(replace(sid::text, '-', ''), 6), p_title, p_genre, uid, p_finished);
  insert into public.lines (id, story_id, parent_id, author_id, text, path)
  values (lid, sid, null, uid, p_text, extensions.text2ltree(public.ltree_label(lid)));
  update public.stories set root_line_id = lid where id = sid;
  return lid;
end $$;

create or replace function pg_temp.add_line(p_parent uuid, p_text text, p_complete boolean default false)
returns uuid language plpgsql as $$
declare
  lid uuid := gen_random_uuid();
begin
  insert into public.lines (id, story_id, parent_id, author_id, text, path)
  select lid, story_id, id, current_setting('seed.uid')::uuid, p_text, path from public.lines where id = p_parent;
  if p_complete then update public.lines set is_complete = true where id = lid; end if;
  return lid;
end $$;

do $$
declare
  l1 uuid; l2a uuid; l3a uuid; l4b uuid; r uuid;
begin
  if not exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Make yourself admin first (see the setup guide, step 6).';
  end if;
  perform set_config('seed.uid', (select id::text from public.profiles where role = 'admin' order by created_at limit 1), false);

  l1 := pg_temp.add_story('The Last Signal', 'Sci-fi',
    'The signal repeated every eleven seconds, and no one on the bridge could explain why it matched Mara''s heartbeat.');
  l2a := pg_temp.add_line(l1, '"It''s not a signal," Mara whispered. "It''s a message from the ship I left behind."');
  perform pg_temp.add_line(l1, 'The captain ordered silence, but Mara was already reaching for the comm switch.');
  perform pg_temp.add_line(l1, 'Systems flagged it as noise. Mara knew better — noise didn''t have a pulse.');
  perform pg_temp.add_line(l1, '"Get me engineering," the captain said, voice flat with dread.');
  perform pg_temp.add_line(l1, 'Mara switched off the comm. Some signals weren''t meant to be answered.');
  l3a := pg_temp.add_line(l2a, 'The ship''s registry was hers — the one she''d scuttled seven years ago in the Kessler drift.');
  perform pg_temp.add_line(l2a, '"No," she said. "That ship burned. I watched it burn."');
  perform pg_temp.add_line(l2a, 'She didn''t answer. She didn''t need to — the crew could see it in her face.');
  perform pg_temp.add_line(l3a, 'Seven years, and the ship had learned to lie just like she had.', true);
  l4b := pg_temp.add_line(l3a, 'Mara''s hands trembled over the console. Whatever answered back wasn''t her ship anymore.');
  perform pg_temp.add_line(l4b, 'It was wearing her ship like a coat.');

  r := pg_temp.add_story('Midnight at Platform Nine', 'Mystery',
    'The last train had already left, so who left the suitcase on the bench?');
  perform pg_temp.add_line(r, 'Officer Kwan crouched beside it. No tag. No ticket stub. Just a heartbeat, faint, from inside.');
  perform pg_temp.add_line(r, '"Don''t touch it," the old man on the bench said. "It isn''t finished ticking yet."');

  r := pg_temp.add_story('The Salt-Iron Throne', 'Fantasy',
    'No king had ever ruled both tides, until the day the iron crown rusted through.');
  perform pg_temp.add_line(r, 'The rust spread like a verdict. The court pretended not to see it reach the king''s hand.');
  perform pg_temp.add_line(r, '"Then we will crown the sea instead," said the smallest of the salt-witches.');

  r := pg_temp.add_story('Letters We Never Sent', 'Drama',
    'She kept every letter he never sent her, in the order she imagined he''d have sent them.', true);
  perform pg_temp.add_line(r, 'The last envelope was blank. She filled it in herself, in his handwriting, and finally believed it.', true);

  r := pg_temp.add_story('A Recipe for Silence', 'Literary',
    'Grandmother''s recipe box had fourteen cards, and the fifteenth was a folded note that said do not make this one.');
  perform pg_temp.add_line(r, 'Of course, someone always makes the one thing they were told not to.');

  r := pg_temp.add_story('The Debugging', 'Comedy',
    'The bug only appeared when nobody was watching the monitor, which was, Priya realized, exactly the problem.', true);
  perform pg_temp.add_line(r, 'She left the camera recording and walked away. Twelve minutes later, the code fixed itself.');
  perform pg_temp.add_line(r, '"It''s not a bug," the intern said quietly. "It''s shy."');
end $$;
