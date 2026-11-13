"use client";
import { useActionState } from "react";
import { adminSavePlan } from "@/app/dashboard-actions";
import type { FormState } from "@/lib/action-utils";
import { FEATURE_INFO } from "@/lib/features";
import type { Plan } from "@/lib/types";
import { SubmitButton } from "@/components/Pending";
import { guard, useKeepOnError } from "@/lib/client-action";
import { FormError } from "@/components/FormError";

export function PlanEditor({ plan, members }: { plan: Plan; members: number }) {
  const [state, action] = useActionState<FormState, FormData>(guard(adminSavePlan), {});
  const keep = useKeepOnError(state);
  const id = (s: string) => `${plan.id}-${s}`;
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} {...keep} className="card p-5" aria-labelledby={id("title")}>
      <input type="hidden" name="planId" value={plan.id} />
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id("title")} className="font-serif text-lg font-semibold">
          {plan.name} <span className="font-sans text-xs font-normal text-faint">({plan.id})</span>
        </h2>
        <span className="text-xs text-faint">
          {members} {members === 1 ? "person" : "people"}
        </span>
      </div>

      <div className="mb-5 grid gap-3 desk:grid-cols-[1fr_140px]">
        <div>
          <label htmlFor={id("name")} className="eyebrow mb-1 block">Name</label>
          <input id={id("name")} name="name" defaultValue={plan.name} maxLength={40} required className="field !py-2 !text-sm" />
          {fe.name && <p className="mt-1 text-xs text-red-800">{fe.name[0]}</p>}
        </div>
        <div>
          <label htmlFor={id("price")} className="eyebrow mb-1 block">Price (₹ / month)</label>
          <input id={id("price")} name="price" type="number" min={0} max={1000000} defaultValue={plan.price_inr} required className="field !py-2 !text-sm" />
          {fe.price && <p className="mt-1 text-xs text-red-800">{fe.price[0]}</p>}
        </div>
        <div className="desk:col-span-2">
          <label htmlFor={id("desc")} className="eyebrow mb-1 block">Short description</label>
          <input id={id("desc")} name="description" defaultValue={plan.description ?? ""} maxLength={280} className="field !py-2 !text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={plan.active} disabled={plan.id === "free"} className="accent-[#8C600A]" />
          Offered on the pricing page
          {plan.id === "free" && <input type="hidden" name="active" value="on" />}
        </label>
      </div>

      <fieldset>
        <legend className="eyebrow mb-2">Included features</legend>
        <ul className="divide-y divide-black/[.06] rounded-[3px] border border-black/[.08]">
          {FEATURE_INFO.map((f) => {
            const current = plan.features[f.key] ?? { enabled: false, quota: null };
            return (
              <li key={f.key} className="flex flex-wrap items-center justify-between gap-3 px-3 py-[10px]">
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" name={`feature_${f.key}`} defaultChecked={current.enabled} className="mt-1 accent-[#8C600A]" />
                  <span>
                    <span className="block font-medium text-ink">{f.label}</span>
                    <span className="text-xs text-faint">{f.detail}</span>
                  </span>
                </label>
                {f.quota && (
                  <span className="flex items-center gap-2">
                    <label htmlFor={id(`q-${f.key}`)} className="text-xs text-faint">
                      Max {f.quota}
                    </label>
                    <input
                      id={id(`q-${f.key}`)}
                      name={`quota_${f.key}`}
                      type="number"
                      min={0}
                      max={100000}
                      defaultValue={current.quota ?? ""}
                      placeholder="No limit"
                      className="field !w-24 !py-[6px] !text-xs"
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton className="btn-primary" pendingLabel="Saving">
          {`Save ${plan.name}`}
        </SubmitButton>
        {state.ok && <span role="status" className="text-xs text-faint">{state.ok}</span>}
        <FormError className="text-xs text-red-800">{state.error}</FormError>
      </div>
    </form>
  );
}
