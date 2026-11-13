"use client";
import { useActionState, useState } from "react";
import { editLine } from "@/app/actions";
import type { FormState } from "@/lib/action-utils";
import { LINE_MAX } from "@/lib/schemas";
import { CharCounter } from "@/components/CharCounter";
import { BotFields } from "@/components/BotFields";
import { SubmitButton } from "@/components/Pending";

export function EditLineForm({ lineId, text: initial }: { lineId: string; text: string }) {
  const [state, action] = useActionState<FormState, FormData>(editLine, {});
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
        <SubmitButton className="btn-primary" disabled={len === 0 || len > LINE_MAX} pendingLabel="Saving">
          Save change
        </SubmitButton>
      </div>
      {(state.error || state.fieldErrors?.text) && (
        <p role="alert" className="mt-3 text-sm text-red-800">
          {state.error ?? state.fieldErrors?.text?.[0]}
        </p>
      )}
    </form>
  );
}
