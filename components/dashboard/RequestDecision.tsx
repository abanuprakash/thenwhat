"use client";
import { useActionState, useState, useTransition } from "react";
import { cancelRequest } from "@/app/actions";
import { decideRequest } from "@/app/dashboard-actions";
import type { FormState } from "@/lib/action-utils";
import type { RequestKind } from "@/lib/types";
import { BusyButton } from "@/components/Pending";
import { ConfirmButton, type Outcome } from "@/components/Confirm";
import { guard, useKeepOnError } from "@/lib/client-action";
import { safely } from "@/lib/client-action";
import { FormError } from "@/components/FormError";

export function RequestDecision({
  requestId,
  kind,
  requester,
  storyTitle,
}: {
  requestId: string;
  kind: RequestKind;
  requester?: string | null;
  storyTitle?: string | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(guard(decideRequest), {});
  const keep = useKeepOnError(state);
  const id = (s: string) => `${s}-${requestId}`;
  const Who = requester ? `@${requester}` : "The writer";
  const story = storyTitle ? `“${storyTitle}”` : "this story";
  const noteLine = (fd: FormData): Outcome[] =>
    String(fd.get("note") ?? "").trim() ? [{ tone: "info", text: <>{Who} sees your note with the decision.</> }] : [];
  const amount = (fd: FormData) => Math.min(Math.max(parseInt(String(fd.get("granted") ?? "1"), 10) || 1, 1), 20);

  const approve = (fd: FormData): Outcome[] => {
    const n = amount(fd);
    return kind === "more_branches"
      ? [
          { tone: "plus", text: `This line can hold ${n} more ${n === 1 ? "branch" : "branches"}.` },
          { tone: "info", text: "Every other line keeps the normal limit." },
          { tone: "plus", text: <>{Who} can write the branch they asked for straight away.</> },
          ...noteLine(fd),
        ]
      : [
          { tone: "plus", text: <>Every path in {story} can go {n} more {n === 1 ? "line" : "lines"} deeper.</> },
          { tone: "plus", text: <>{Who} and everyone else can continue past the old limit.</> },
          ...noteLine(fd),
        ];
  };
  const decline = (fd: FormData): Outcome[] => [
    { tone: "minus", text: "Nothing changes: the limit stays where it is." },
    { tone: "info", text: <>{Who} sees that the request was declined.</> },
    ...noteLine(fd),
  ];

  if (state.ok) {
    return (
      <p role="status" className="text-sm font-medium text-ink">
        {state.ok}
      </p>
    );
  }

  return (
    <form action={action} {...keep} className="mt-1 space-y-3 border-t border-black/[.06] pt-3">
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
        <ConfirmButton
          error={state.error ?? state.fieldErrors?.granted?.[0]}
          label="Approve"
          eyebrow={kind === "more_branches" ? "More branches on a line" : "A longer story"}
          title={kind === "more_branches" ? "Give this line more room?" : "Let the story go further?"}
          outcomes={approve}
          confirmLabel="Approve"
          pendingLabel="Approving"
          name="approve"
          value="yes"
        />
        <ConfirmButton
          error={state.error ?? state.fieldErrors?.granted?.[0]}
          label="Decline"
          className="btn-secondary"
          eyebrow={kind === "more_branches" ? "More branches on a line" : "A longer story"}
          title="Decline this request?"
          outcomes={decline}
          confirmLabel="Decline"
          pendingLabel="Declining"
          name="approve"
          value="no"
          caution
        />
      </div>
      <FormError className="text-xs text-red-800">{state.error ?? state.fieldErrors?.granted?.[0]}</FormError>
    </form>
  );
}

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="mt-2">
      <BusyButton
        className="text-xs font-semibold text-faint hover:text-ink"
        busy={pending}
        pendingLabel="Withdrawing"
        onClick={() => start(async () => setError((await safely(() => cancelRequest(requestId))).error))}
      >
        Withdraw request
      </BusyButton>
      <FormError className="mt-1 text-xs text-red-800">{error}</FormError>
    </div>
  );
}
