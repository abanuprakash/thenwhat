"use client";
import { useActionState, useState } from "react";
import { writeLine } from "@/app/actions";
import type { FormState } from "@/lib/action-utils";
import { BotFields } from "@/components/BotFields";
import { Spark } from "@/components/Spark";
import { LINE_MAX } from "@/lib/schemas";
import { CharCounter } from "@/components/CharCounter";
import { SubmitButton } from "@/components/Pending";

export function Composer({ parentId }: { parentId: string }) {
  const [state, action] = useActionState<FormState, FormData>(writeLine, {});
  const [text, setText] = useState("");
  const len = text.trim().length;
  const error = state.error ?? state.fieldErrors?.text?.[0];

  return (
    <form action={action}>
      <BotFields />
      <input type="hidden" name="parentId" value={parentId} />
      <label htmlFor="text" className="sr-only">
        Your next line
      </label>
      <textarea
        id="text"
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="And then…"
        aria-describedby="text-count"
        autoFocus
        className="field min-h-[120px] resize-y !p-4 font-serif !text-base leading-normal"
      />
      <div className="mt-[10px] flex items-center justify-between">
        <CharCounter length={len} id="text-count" />
        <SubmitButton className="btn-primary" disabled={len === 0 || len > LINE_MAX} pendingLabel="Adding">
          Add my line
        </SubmitButton>
      </div>
      <p className="mt-2 text-[11px] text-faint">One line, up to {LINE_MAX} characters. Leave readers wanting the next one.</p>
      <Spark />
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
