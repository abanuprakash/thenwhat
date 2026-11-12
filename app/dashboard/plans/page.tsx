import type { Metadata } from "next";
import { getPlans, requireAdmin } from "@/lib/queries";
import { getDashboardStats } from "@/lib/dashboard-queries";
import { PlanEditor } from "@/components/dashboard/PlanEditor";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  await requireAdmin();
  const [plans, stats] = await Promise.all([getPlans(true), getDashboardStats()]);
  return (
    <div className="space-y-6">
      <p className="max-w-[680px] text-sm leading-relaxed text-muted">
        Choose what each plan includes. Changes apply straight away to everyone on that plan, and the database enforces
        them. Payments aren&apos;t connected yet, so switch people&apos;s plans by hand under Users. Admins always have
        everything.
      </p>
      {plans.map((p) => (
        <PlanEditor key={p.id} plan={p} members={stats?.plans?.[p.id] ?? 0} />
      ))}
    </div>
  );
}
