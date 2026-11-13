import { IntentLink } from "@/components/IntentLink";
import { describeActivity } from "@/lib/activity";
import { timeAgo } from "@/lib/format";
import type { ActivityRow } from "@/lib/types";

export function ActivityList({ rows }: { rows: ActivityRow[] }) {
  return (
    <ol className="card divide-y divide-black/[.06]">
      {rows.map((a) => {
        const { text, href } = describeActivity(a);
        return (
          <li key={a.id} className="flex flex-col gap-1 px-4 py-3 desk:flex-row desk:items-baseline desk:justify-between desk:gap-6">
            <span className="text-sm leading-snug text-ink">
              {href ? (
                <IntentLink href={href} className="text-ink hover:text-gold">
                  {text}
                </IntentLink>
              ) : (
                text
              )}
            </span>
            <time dateTime={a.created_at} title={new Date(a.created_at).toLocaleString("en-IN")} className="flex-none text-[11px] text-faint">
              {timeAgo(a.created_at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
