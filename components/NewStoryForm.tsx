"use client";
import { useActionState, useState } from "react";
import { createStory } from "@/app/actions";
import type { FormState } from "@/lib/action-utils";
import { BotFields } from "@/components/BotFields";
import { GENRES, type Genre } from "@/lib/types";
import { LINE_MAX } from "@/lib/schemas";
import { CharCounter } from "@/components/CharCounter";
import { ConfirmButton } from "@/components/Confirm";
import { guard } from "@/lib/client-action";
import { FormError } from "@/components/FormError";

export function NewStoryForm() {
  const [state, action] = useActionState<FormState, FormData>(guard(createStory), {});
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<Genre>("Sci-fi");
  const [opening, setOpening] = useState("");
  const len = opening.trim().length;
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action}>
      <BotFields />
      <div className="mb-5" data-tour="story-title">
        <label htmlFor="title" className="eyebrow mb-2 block">
          Title
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Something worth wondering about"
          className="field"
        />
        {fe.title && <p className="mt-1 text-xs text-red-800">{fe.title[0]}</p>}
      </div>

      <fieldset className="mb-5" data-tour="story-genre">
        <legend className="eyebrow mb-2">Genre</legend>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <label
              key={g}
              className={`cursor-pointer rounded-full border px-[14px] py-[6px] text-xs font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold ${
                genre === g ? "border-gold bg-cream text-gold" : "border-black/10 bg-white text-muted"
              }`}
            >
              <input
                type="radio"
                name="genre"
                value={g}
                checked={genre === g}
                onChange={() => setGenre(g)}
                className="sr-only"
              />
              {g}
            </label>
          ))}
        </div>
      </fieldset>

      <div data-tour="story-opening">
        <label htmlFor="firstLine" className="eyebrow mb-2 block">
          The first line
        </label>
        <p className="-mt-1 mb-2 text-[11px] text-faint">Make it one that makes people ask &ldquo;then what?&rdquo;</p>
        <textarea
          id="firstLine"
          name="firstLine"
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
          placeholder="It began when…"
          aria-describedby="opening-count"
          className="field min-h-[120px] resize-y !p-4 font-serif !text-base leading-normal"
        />
        <div className="mt-[10px] flex items-center justify-between">
          <CharCounter length={len} id="opening-count" />
          <ConfirmButton
            error={state.error ?? fe.title?.[0] ?? fe.firstLine?.[0]}
            label="Begin the story"
            disabled={!title.trim() || len === 0 || len > LINE_MAX}
            eyebrow={`New ${genre} story`}
            title={<>Publish “{title.trim()}”?</>}
            preview={opening.trim()}
            outcomes={[
              { tone: "plus", text: "It goes live straight away with your opening line. Anyone can read it." },
              { tone: "plus", text: "Invited writers can add the next lines and branch from any of them." },
              { tone: "info", text: "You can edit the opening line until someone continues it. The title and genre stay as they are." },
              { tone: "info", text: "You'll find it in your dashboard, with anything waiting for your decision." },
            ]}
            confirmLabel="Publish story"
            pendingLabel="Publishing"
          />
        </div>
        <FormError className="mt-3 text-sm text-red-800">{state.error ?? fe.firstLine?.[0]}</FormError>
      </div>
    </form>
  );
}
