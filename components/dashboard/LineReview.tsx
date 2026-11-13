"use client";
import { useActionState } from "react";
import { reviewLine } from "@/app/dashboard-actions";
import type { FormState } from "@/lib/action-utils";
import { SubmitButton } from "@/components/Pending";

/** Approve or reject a pending line (or a pending edit), with an optional note to the writer. */
export function LineReview({ lineId, idPrefix = "r" }: { lineId: string; idPrefix?: string }) {
  const [state, action] = useActionState<FormState, FormData>(reviewLine, {});
  const noteId = `${idPrefix}-note-${lineId}`;
  if (state.ok) {
    return (
      <p role="status" className="text-sm font-medium text-ink">
        {state.ok}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="lineId" value={lineId} />
      <label htmlFor={noteId} className="eyebrow block">
        Note to the writer (optional)
      </label>
      <input id={noteId} name="note" maxLength={280} className="field !py-2 !text-sm" />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="approve" value="yes" className="btn-primary">
          Approve
        </SubmitButton>
        <SubmitButton name="approve" value="no" className="btn-secondary">
          Don&apos;t publish
        </SubmitButton>
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-red-800">
          {state.error}
        </p>
      )}
    </form>
  );
}
