"use client";
import { useActionState, useState } from "react";
import { editLine } from "@/app/actions";
import type { FormState } from "@/lib/action-utils";
import { LINE_MAX } from "@/lib/schemas";
import { CharCounter } from "@/components/CharCounter";
import { BotFields } from "@/components/BotFields";

export function EditLineForm({ lineId, text: initial }: { lineId: string; text: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(editLine, {});
  const [text, setText] = useState(initial);
  const len = text.trim().length;
  if (state.ok) {
    return (
      <p role="status" className="panel px-5 py-4 text-sm text-ink">
        {state.ok}
      </p>
    );
  }
  return (
    <form action={action}>
      <BotFields />
      <input type="hidden" name="lineId" value={lineId} />
      <label htmlFor="text" className="sr-only">
        Your line
      </label>
      <textarea
        id="text"
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-describedby="edit-count"
        className="field min-h-[120px] resize-y !p-4 font-serif !text-base leading-normal"
      />
      <div className="mt-[10px] flex items-center justify-between">
        <CharCounter length={len} id="edit-count" />
        <button type="submit" className="btn-primary" disabled={pending || len === 0 || len > LINE_MAX}>
          {pending ? "Saving…" : "Save change"}
        </button>
      </div>
      {(state.error || state.fieldErrors?.text) && (
        <p role="alert" className="mt-3 text-sm text-red-800">
          {state.error ?? state.fieldErrors?.text?.[0]}
        </p>
      )}
    </form>
  );
}
