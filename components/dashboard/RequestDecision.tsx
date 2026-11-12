"use client";
import { useActionState, useState, useTransition } from "react";
import { cancelRequest } from "@/app/actions";
import { decideRequest } from "@/app/dashboard-actions";
import type { FormState } from "@/lib/action-utils";
import type { RequestKind } from "@/lib/types";

export function RequestDecision({ requestId, kind }: { requestId: string; kind: RequestKind }) {
  const [state, action, pending] = useActionState<FormState, FormData>(decideRequest, {});
  const id = (s: string) => `${s}-${requestId}`;

  if (state.ok) {
    return (
      <p role="status" className="text-sm font-medium text-ink">
        {state.ok}
      </p>
    );
  }

  return (
    <form action={action} className="mt-1 space-y-3 border-t border-black/[.06] pt-3">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={id("granted")} className="eyebrow mb-1 block">
            {kind === "more_branches" ? "Extra branches on this line" : "Extra lines on every path"}
          </label>
          <input
            id={id("granted")}
            name="granted"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            defaultValue={1}
            className="field !w-24 !py-2 !text-sm"
            aria-describedby={id("granted-help")}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor={id("note")} className="eyebrow mb-1 block">
            Note to the writer (optional)
          </label>
          <input id={id("note")} name="note" maxLength={280} className="field !py-2 !text-sm" />
        </div>
      </div>
      <p id={id("granted-help")} className="text-[11px] text-faint">
        {kind === "more_branches"
          ? "Only this line gets the extra room. Other lines keep the normal limit."
          : "This raises the length limit for the whole story, so every path can go further."}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="approve" value="yes" className="btn-primary" disabled={pending}>
          Approve
        </button>
        <button type="submit" name="approve" value="no" className="btn-secondary" disabled={pending}>
          Decline
        </button>
      </div>
      {(state.error || state.fieldErrors?.granted) && (
        <p role="alert" className="text-xs text-red-800">
          {state.error ?? state.fieldErrors?.granted?.[0]}
        </p>
      )}
    </form>
  );
}

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="mt-2">
      <button
        type="button"
        className="text-xs font-semibold text-faint hover:text-ink"
        disabled={pending}
        onClick={() => start(async () => setError((await cancelRequest(requestId)).error))}
      >
        {pending ? "Withdrawing…" : "Withdraw request"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
