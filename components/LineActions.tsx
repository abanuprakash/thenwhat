"use client";
import { useState, useTransition } from "react";
import { markComplete, reportLine } from "@/app/actions";
import { BusyButton } from "@/components/Pending";

export function MarkCompleteButton({ lineId, slug }: { lineId: string; slug: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="mt-4 border-t border-black/[.06] pt-[14px]">
      <BusyButton
        className="btn-outline-gold"
        busy={pending}
        pendingLabel="Marking"
        onClick={() =>
          start(async () => {
            const res = await markComplete(lineId, slug);
            if (res.error) setError(res.error);
          })
        }
      >
        Mark this ending as complete
      </BusyButton>
      {error && <p role="alert" className="mt-2 text-xs text-red-800">{error}</p>}
    </div>
  );
}

export function ReportButton({ lineId, signedIn }: { lineId: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string>();
  const [pending, start] = useTransition();

  if (!signedIn) return null;
  if (done) return <span className="text-[11px] text-faint">{done}</span>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[11px] font-medium text-faint hover:text-ink">
        Report
      </button>
    );
  }
  return (
    <form
      className="animate-reveal flex w-full flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        start(async () => {
          const res = await reportLine(lineId, reason);
          setDone(res.error ?? "Thanks. An admin will take a look.");
        });
      }}
    >
      <label htmlFor={`report-${lineId}`} className="sr-only">
        Why are you reporting this line?
      </label>
      <input
        id={`report-${lineId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={280}
        placeholder="What's wrong with it? (optional)"
        className="field !py-[6px] !text-xs flex-1"
      />
      <BusyButton type="submit" busy={pending}>
        Send report
      </BusyButton>
      <button type="button" className="text-xs text-faint hover:text-ink" disabled={pending} onClick={() => setOpen(false)}>
        Cancel
      </button>
    </form>
  );
}
