import type { Metadata } from "next";
import Link from "next/link";
import { getOpenReports, requireAdmin } from "@/lib/queries";
import { AdminLineActions } from "@/components/AdminTools";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAdmin();
  const reported = await getOpenReports();

  return (
    <div className="max-w-[760px]">
      <section>
        <h2 className="eyebrow mb-3">Reported lines ({reported.length})</h2>
        {reported.length === 0 && <p className="panel px-4 py-6 text-center text-sm text-faint">Nothing to review.</p>}
        <ul className="space-y-3">
          {reported.map(({ line, reports }) => (
            <li key={line.id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-faint">
                {line.hidden ? <span className="badge-muted">Hidden</span> : <span className="badge-gold">Visible</span>}
                <span>
                  {reports.length} {reports.length === 1 ? "report" : "reports"}
                </span>
                <span>·</span>
                <Link href={`/s/${line.story?.slug}/${line.id}`}>{line.story?.title}</Link>
                <span>· by @{line.author?.handle}</span>
              </div>
              <p className="mb-3 font-serif text-[15px] leading-normal">{line.text}</p>
              <ul className="mb-3 space-y-1 text-xs text-muted">
                {reports.map((r, i) => (
                  <li key={i}>
                    @{r.reporter?.handle ?? "someone"}: {r.reason || <em>no reason given</em>} · {timeAgo(r.created_at)}
                  </li>
                ))}
              </ul>
              <AdminLineActions lineId={line.id} hidden={line.hidden} />
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}
