import type { Metadata } from "next";
import Link from "next/link";
import { getEntitlements, getPlans, getViewer } from "@/lib/queries";
import { FEATURE_INFO } from "@/lib/features";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const [plans, viewer, ent] = await Promise.all([getPlans(), getViewer(), getEntitlements()]);
  const current = ent?.plan;
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-24 pt-9 desk:px-6">
      <h1 className="mb-2 font-serif text-[28px] font-semibold">Plans</h1>
      <p className="mb-8 max-w-[620px] text-sm leading-relaxed text-muted">
        Reading every published story is always free. Writing needs an invite from an existing author, plus a plan that
        includes it.
      </p>

      <ul className="grid gap-4 desk:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.id === current;
          return (
            <li key={p.id} style={{ "--i": p.sort } as React.CSSProperties} className={`card animate-stagger lift flex flex-col p-5 ${isCurrent ? "border-gold ring-2 ring-cream" : ""}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 className="font-serif text-xl font-semibold">{p.name}</h2>
                {isCurrent && <span className="badge-gold">Your plan</span>}
              </div>
              <p className="mb-3">
                <span className="text-2xl font-bold text-ink">{inr(p.price_inr)}</span>
                {p.price_inr > 0 && <span className="text-xs text-faint"> / month</span>}
              </p>
              {p.description && <p className="mb-4 text-sm text-muted">{p.description}</p>}
              <ul className="mt-auto space-y-[6px] text-sm">
                {FEATURE_INFO.map((f) => {
                  const st = p.features[f.key];
                  const on = st?.enabled;
                  return (
                    <li key={f.key} className={`flex items-start gap-2 ${on ? "text-ink" : "text-faint"}`}>
                      <span aria-hidden="true" className={on ? "text-[#2F5420]" : ""}>
                        {on ? "✓" : "–"}
                      </span>
                      <span>
                        <span className="sr-only">{on ? "Included: " : "Not included: "}</span>
                        {f.label}
                        {on && f.quota && (st?.quota == null ? " (unlimited)" : ` (up to ${st.quota})`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>

      <div className="panel mt-8 px-5 py-4 text-sm leading-relaxed text-muted">
        <strong className="text-ink">How to upgrade:</strong> online payment is coming soon. Until then, an admin switches
        your plan for you.{" "}
        {viewer ? (
          <>
            Tell them your handle, <strong className="text-ink">@{viewer.profile.handle}</strong>.
          </>
        ) : (
          <>
            <Link href="/login?next=/pricing">Sign in</Link> first so they know which account to upgrade.
          </>
        )}
      </div>
    </div>
  );
}
