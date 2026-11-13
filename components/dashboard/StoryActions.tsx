"use client";
import { useActionState } from "react";
import { setStoryLimits, setStoryModeration, setStoryStatus } from "@/app/dashboard-actions";
import type { FormState } from "@/lib/action-utils";
import type { StoryStatus } from "@/lib/types";
import { SubmitButton } from "@/components/Pending";
import { ConfirmButton } from "@/components/Confirm";

/** Inactivate / reactivate (each confirmed in a dialog or bottom sheet), and per-story rules. */
export function StoryActions({
  storyId,
  title,
  status,
  canSetRules,
  canModerate,
  autoApprove,
  maxBranches,
  maxDepth,
  idPrefix,
  adminOverride = false,
}: {
  storyId: string;
  title: string;
  status: StoryStatus;
  /** Admins, or the starter on a plan with story rules. */
  canSetRules: boolean;
  /** Admins, or the starter on a plan with approvals. */
  canModerate: boolean;
  /** This story's own approval setting (null = follow the site). */
  autoApprove: boolean | null;
  maxBranches: number | null;
  maxDepth: number | null;
  /** The page renders a phone and a desktop copy; this keeps their ids unique. */
  idPrefix: string;
  /** An admin acting on someone else's story (only an admin can then reactivate it). */
  adminOverride?: boolean;
}) {
  const [statusState, statusAction] = useActionState<FormState, FormData>(setStoryStatus, {});
  const [limitState, limitAction] = useActionState<FormState, FormData>(setStoryLimits, {});
  const [modState, modAction] = useActionState<FormState, FormData>(setStoryModeration, {});
  const id = (s: string) => `${idPrefix}-${s}-${storyId}`;
  const next: StoryStatus = status === "active" ? "inactive" : "active";

  return (
    <div className="space-y-2">
      <form action={statusAction}>
        <input type="hidden" name="storyId" value={storyId} />
        <input type="hidden" name="status" value={next} />
        {next === "inactive" ? (
          <ConfirmButton
            label="Make inactive"
            className="btn-secondary"
            ariaLabel={`Make inactive: ${title}`}
            eyebrow="Story"
            title="Make this story inactive?"
            preview={title}
            outcomes={[
              { tone: "minus", text: "It leaves the feed, and readers can't open it." },
              { tone: "minus", text: "Nobody can add, edit or vote on its lines." },
              { tone: "info", text: "Nothing is deleted. Lines, votes and followers stay as they are." },
              {
                tone: "info",
                text: adminOverride
                  ? "Because an admin switched it off, only an admin can switch it back on."
                  : "You can reactivate it whenever you like.",
              },
            ]}
            confirmLabel="Make inactive"
            pendingLabel="Saving"
            caution
          >
            <label htmlFor={id("reason")} className="eyebrow block">
              Reason (optional, shown to the story&apos;s starter)
            </label>
            <input id={id("reason")} name="reason" maxLength={280} className="field !py-2 !text-sm" />
          </ConfirmButton>
        ) : (
          <ConfirmButton
            label="Reactivate"
            className="btn-outline-gold"
            ariaLabel={`Reactivate: ${title}`}
            eyebrow="Story"
            title="Bring this story back?"
            preview={title}
            outcomes={[
              { tone: "plus", text: "It's back in the feed and open to read." },
              { tone: "plus", text: "Writers can add lines and readers can vote again, within the story's limits." },
              { tone: "info", text: "Lines that were waiting for approval are still in the review queue." },
            ]}
            confirmLabel="Reactivate"
            pendingLabel="Saving"
          />
        )}
      </form>
      {statusState.error && (
        <p role="alert" className="text-xs text-red-800">
          {statusState.error}
        </p>
      )}
      {statusState.ok && (
        <p role="status" className="text-xs text-faint">
          {statusState.ok}
        </p>
      )}

      {canModerate && (
        <form action={modAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="storyId" value={storyId} />
          <label htmlFor={id("mode")} className="sr-only">
            New lines in {title}
          </label>
          <select
            id={id("mode")}
            name="mode"
            defaultValue={autoApprove === null ? "inherit" : autoApprove ? "auto" : "review"}
            className="field !w-auto !py-[6px] !text-xs"
          >
            <option value="inherit">New lines: site setting</option>
            <option value="auto">New lines: publish straight away</option>
            <option value="review">New lines: hold for approval</option>
          </select>
          <SubmitButton className="btn-secondary !py-[6px]">
            Save
          </SubmitButton>
          {(modState.ok || modState.error) && (
            <span role={modState.error ? "alert" : "status"} className={`w-full text-[11px] ${modState.error ? "text-red-800" : "text-faint"}`}>
              {modState.error ?? modState.ok}
            </span>
          )}
        </form>
      )}

      {canSetRules && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-gold hover:text-gold-dark">Story limits</summary>
          <form action={limitAction} className="mt-2 space-y-2 rounded-[3px] bg-sand p-3">
            <input type="hidden" name="storyId" value={storyId} />
            <p className="text-[11px] text-faint">Leave blank to follow the site rules.</p>
            <div className="flex flex-wrap gap-3">
              <div>
                <label htmlFor={id("mb")} className="eyebrow mb-1 block">
                  Branches / line
                </label>
                <input id={id("mb")} name="maxBranches" type="number" min={1} max={50} defaultValue={maxBranches ?? ""} className="field !w-24 !py-2 !text-sm" />
              </div>
              <div>
                <label htmlFor={id("md")} className="eyebrow mb-1 block">
                  Lines / path
                </label>
                <input id={id("md")} name="maxDepth" type="number" min={2} max={200} defaultValue={maxDepth ?? ""} className="field !w-24 !py-2 !text-sm" />
              </div>
            </div>
            <SubmitButton className="btn-secondary">
              Save limits
            </SubmitButton>
            {(limitState.error || limitState.fieldErrors) && (
              <p role="alert" className="text-xs text-red-800">
                {limitState.error ?? Object.values(limitState.fieldErrors ?? {}).flat()[0]}
              </p>
            )}
            {limitState.ok && (
              <p role="status" className="text-xs text-faint">
                {limitState.ok}
              </p>
            )}
          </form>
        </details>
      )}
    </div>
  );
}
