"use client";
import { useActionState } from "react";
import { adminSetPlan } from "@/app/dashboard-actions";
import type { FormState } from "@/lib/action-utils";
import { SubmitButton } from "@/components/Pending";
import { guard, useKeepOnError } from "@/lib/client-action";
import { FormError } from "@/components/FormError";

export function UserPlanForm({
  handle,
  plan,
  expiresAt,
  plans,
  idPrefix,
}: {
  handle: string;
  plan: string;
  expiresAt: string | null;
  plans: { id: string; name: string }[];
  idPrefix: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(guard(adminSetPlan), {});
  const keep = useKeepOnError(state);
  const id = (s: string) => `${idPrefix}-${s}-${handle}`;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} {...keep} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="handle" value={handle} />
      <label htmlFor={id("plan")} className="sr-only">
        Plan for @{handle}
      </label>
      <select id={id("plan")} name="plan" defaultValue={plan} className="field !w-auto !py-[6px] !text-xs">
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <label htmlFor={id("until")} className="sr-only">
        Plan ends on (optional)
      </label>
      <input
        id={id("until")}
        name="expiresAt"
        type="date"
        min={today}
        defaultValue={expiresAt ? expiresAt.slice(0, 10) : ""}
        title="Optional end date. Leave empty for no end."
        className="field !w-auto !py-[5px] !text-xs"
      />
      <SubmitButton className="btn-secondary !py-[6px]">
        Save
      </SubmitButton>
      {state.ok && (
        <span role="status" className="w-full text-[11px] text-faint">
          {state.ok}
        </span>
      )}
      <FormError className="w-full text-[11px] text-red-800">{state.error ?? Object.values(state.fieldErrors ?? {}).flat()[0]}</FormError>
    </form>
  );
}
