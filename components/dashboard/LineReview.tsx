"use client";
import { useActionState } from "react";
import { reviewLine } from "@/app/dashboard-actions";
import type { FormState } from "@/lib/action-utils";
import { ConfirmButton, type Outcome } from "@/components/Confirm";

/**
 * Approve or reject a pending line (or a pending edit), with an optional note to the writer.
 * Each decision opens a confirmation that says exactly what will happen.
 */
export function LineReview({
  lineId,
  writer,
  text,
  isEdit = false,
  idPrefix = "r",
}: {
  lineId: string;
  /** The writer's handle, for the confirmation. */
  writer?: string | null;
  /** The line (or the proposed new wording) being decided on. */
  text: string;
  isEdit?: boolean;
  idPrefix?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(reviewLine, {});
  const noteId = `${idPrefix}-note-${lineId}`;
  if (state.ok) {
    return (
      <p role="status" className="text-sm font-medium text-ink">
        {state.ok}
      </p>
    );
  }

  const who = writer ? `@${writer}` : "the writer";
  const Who = writer ? `@${writer}` : "The writer";
  const noteLine = (fd: FormData): Outcome[] =>
    String(fd.get("note") ?? "").trim() ? [{ tone: "info", text: <>{Who} sees your note with the decision.</> }] : [];

  const approve = (fd: FormData): Outcome[] =>
    isEdit
      ? [
          { tone: "plus", text: "The new wording replaces the old one, for everyone." },
          { tone: "info", text: "Votes and the branches below it stay as they are." },
          ...noteLine(fd),
        ]
      : [
          { tone: "plus", text: <>The line goes live in the story, credited to {who}.</> },
          { tone: "plus", text: "Readers can vote on it, and writers can continue or branch from it." },
          ...noteLine(fd),
        ];

  const reject = (fd: FormData): Outcome[] =>
    isEdit
      ? [
          { tone: "minus", text: "The proposed wording is dropped. The line keeps its current text." },
          { tone: "info", text: <>{Who} can suggest a different edit.</> },
          ...noteLine(fd),
        ]
      : [
          { tone: "minus", text: "The line isn't published. Readers never see it." },
          { tone: "plus", text: "Its branch slot opens up again, so someone else can write here." },
          { tone: "info", text: <>{Who} can edit it and send it again.</> },
          ...noteLine(fd),
        ];

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="lineId" value={lineId} />
      <label htmlFor={noteId} className="eyebrow block">
        Note to the writer (optional)
      </label>
      <input id={noteId} name="note" maxLength={280} className="field !py-2 !text-sm" />
      <div className="flex flex-wrap gap-2">
        <ConfirmButton
          label="Approve"
          eyebrow={isEdit ? "Edit waiting for approval" : "New line waiting for approval"}
          title={isEdit ? "Publish this edit?" : "Publish this line?"}
          preview={<>“{text}”</>}
          outcomes={approve}
          confirmLabel={isEdit ? "Publish edit" : "Publish line"}
          pendingLabel="Publishing"
          name="approve"
          value="yes"
        />
        <ConfirmButton
          label="Don't publish"
          className="btn-secondary"
          eyebrow={isEdit ? "Edit waiting for approval" : "New line waiting for approval"}
          title={isEdit ? "Keep the original wording?" : "Don't publish this line?"}
          preview={<>“{text}”</>}
          outcomes={reject}
          confirmLabel={isEdit ? "Reject edit" : "Don't publish"}
          confirmClassName="btn-primary"
          pendingLabel="Saving"
          name="approve"
          value="no"
          caution
        />
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-red-800">
          {state.error}
        </p>
      )}
    </form>
  );
}
