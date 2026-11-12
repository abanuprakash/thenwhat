import Link from "next/link";

/** Shown in place of a feature the person's plan doesn't include. */
export function Locked({ feature, compact = false }: { feature: string; compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-faint">
        {feature} isn&apos;t part of your plan. <Link href="/pricing">See plans</Link>
      </p>
    );
  }
  return (
    <div className="panel px-5 py-5" role="note">
      <p className="text-sm font-semibold text-ink">{feature} isn&apos;t part of your plan</p>
      <p className="mt-1 text-sm text-muted">
        <Link href="/pricing">Compare plans</Link> to see which one includes it. An admin can switch your plan.
      </p>
    </div>
  );
}
