"use client";
import { useActionState, useState } from "react";
import { requestLimitIncrease } from "@/app/actions";
import type { FormState } from "@/lib/action-utils";
import { BotFields } from "@/components/BotFields";
import type { RequestKind } from "@/lib/types";

export function RequestLimitForm({ lineId, kind }: { lineId: string; kind: RequestKind }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(requestLimitIncrease, {});
  const [message, setMessage] = useState("");
  const msgId = `request-${kind}-${lineId}`;
  const error = state.error ?? state.fieldErrors?.message?.[0];

  if (state.ok) {
    return (
      <p role="status" className="mt-3 text-sm text-ink">
        {state.ok}
      </p>
    );
  }
  if (!open) {
    return (
      <button type="button" className="btn-outline-gold mt-3" onClick={() => setOpen(true)} aria-expanded={false}>
        {kind === "more_branches" ? "Ask for another branch" : "Ask to extend this story"}
      </button>
    );
  }
  return (
    <form action={action} className="animate-reveal mt-3 space-y-2">
      <BotFields />
      <input type="hidden" name="lineId" value={lineId} />
      <input type="hidden" name="kind" value={kind} />
      <label htmlFor={msgId} className="eyebrow block">
        Why should this {kind === "more_branches" ? "line get another branch" : "story go further"}?
      </label>
      <textarea
        id={msgId}
        name="message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        minLength={10}
        maxLength={500}
        required
        autoFocus
        aria-describedby={`${msgId}-help`}
        className="field min-h-[90px] !text-sm"
        placeholder="A sentence or two about where you'd take it."
      />
      <p id={`${msgId}-help`} className="text-[11px] text-faint">
        The story&apos;s starter or an admin will review it. {message.trim().length}/500
      </p>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending || message.trim().length < 10}>
          {pending ? "Sending…" : "Send request"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-800">
          {error}
        </p>
      )}
    </form>
  );
}
