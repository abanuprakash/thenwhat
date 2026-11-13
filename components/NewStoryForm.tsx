"use client";
import { useActionState, useState } from "react";
import { createStory } from "@/app/actions";
import type { FormState } from "@/lib/action-utils";
import { BotFields } from "@/components/BotFields";
import { GENRES, type Genre } from "@/lib/types";
import { LINE_MAX } from "@/lib/schemas";
import { CharCounter } from "@/components/CharCounter";
import { SubmitButton } from "@/components/Pending";

export function NewStoryForm() {
  const [state, action] = useActionState<FormState, FormData>(createStory, {});
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<Genre>("Sci-fi");
  const [opening, setOpening] = useState("");
  const len = opening.trim().length;
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action}>
      <BotFields />
      <div className="mb-5">
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

      <fieldset className="mb-5">
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

      <div>
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
          <SubmitButton className="btn-primary" disabled={!title.trim() || len === 0 || len > LINE_MAX} pendingLabel="Starting">
            Begin the story
          </SubmitButton>
        </div>
        {(state.error || fe.firstLine) && (
          <p role="alert" className="mt-3 text-sm text-red-800">
            {state.error ?? fe.firstLine?.[0]}
          </p>
        )}
      </div>
    </form>
  );
}
