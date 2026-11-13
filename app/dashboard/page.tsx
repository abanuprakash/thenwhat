import Link from "next/link";
import { getViewer } from "@/lib/queries";
import { getActivity, getDashboardStats, getRequests, getSettings } from "@/lib/dashboard-queries";
import { Empty, SectionTitle, StatCard, limitLabel } from "@/components/dashboard/ui";
import { ActivityList } from "@/components/dashboard/ActivityList";
import { RequestCard } from "@/components/dashboard/RequestCard";
import { PageTour } from "@/components/Tour";
import { InfoTip } from "@/components/InfoTip";

export default async function DashboardOverview() {
  const viewer = (await getViewer())!;
  const isAdmin = viewer.profile.role === "admin";
  const [stats, settings, pending, activity] = await Promise.all([
    getDashboardStats(),
    getSettings(),
    getRequests(viewer, { status: "pending", mine: false, page: 1 }),
    getActivity("all", 1, 8),
  ]);
  const toReview = pending.rows.filter((r) => r.requester_id !== viewer.id || isAdmin).slice(0, 3);

  return (
    <div className="space-y-9">
      <PageTour id="dashboard" />
      <section aria-labelledby="numbers" data-tour="dash-stats">
        <h2 id="numbers" className="sr-only">
          Numbers
        </h2>
        <div className="grid grid-cols-2 gap-3 desk:grid-cols-4">
          <StatCard
            label={isAdmin ? "Lines waiting for approval" : "Lines waiting on your stories"}
            value={stats?.pending_lines ?? 0}
            href="/dashboard/review"
            highlight={(stats?.pending_lines ?? 0) > 0}
          />
          <StatCard
            label={isAdmin ? "Requests waiting" : "Requests on your stories"}
            value={stats?.pending_requests ?? 0}
            href="/dashboard/requests"
            highlight={(stats?.pending_requests ?? 0) > 0}
          />
          <StatCard label={isAdmin ? "Active stories" : "Your active stories"} value={stats?.stories_active ?? 0} href="/dashboard/stories?status=active" />
          <StatCard label={isAdmin ? "Lines this week" : "Lines on your stories this week"} value={stats?.lines_7d ?? 0} />
          {isAdmin && stats?.users && (
            <>
              <StatCard label="Readers" value={stats.users.reader ?? 0} href="/dashboard/users?role=reader" />
              <StatCard label="Authors" value={stats.users.author ?? 0} href="/dashboard/users?role=author" />
              <StatCard label="Admins" value={stats.users.admin ?? 0} href="/dashboard/users?role=admin" />
              <StatCard label="Reported lines" value={stats.open_reports ?? 0} href="/dashboard/reports" highlight={(stats.open_reports ?? 0) > 0} />
            </>
          )}
          {!isAdmin && (
            <>
              <StatCard label="Your lines waiting" value={stats?.my_pending_lines ?? 0} href="/dashboard/review?mine=1" />
              <StatCard label="Your requests waiting" value={stats?.my_pending_requests ?? 0} href="/dashboard/requests?mine=1" />
              <StatCard label="Inactive stories" value={stats?.stories_inactive ?? 0} href="/dashboard/stories?status=inactive" />
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="rules" data-tour="dash-rules">
        <SectionTitle action={isAdmin ? <Link href="/dashboard/settings" className="text-xs font-semibold">Change</Link> : undefined}>
          <span id="rules" className="inline-flex items-center gap-1">
            Site rules
            <InfoTip title="Site rules" art="branches">
              The limits every story starts with. A single story can have its own, set from the Stories tab.
            </InfoTip>
          </span>
        </SectionTitle>
        <dl className="card grid grid-cols-2 gap-4 p-4 desk:grid-cols-4">
          <div>
            <dt className="text-[11px] font-medium text-faint">Branches per line</dt>
            <dd className="mt-1 text-sm font-semibold">{limitLabel(settings.max_branches_per_line, "branches")}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-faint">Lines per path</dt>
            <dd className="mt-1 text-sm font-semibold">{limitLabel(settings.max_depth, "lines")}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-faint">Lines per author, per hour</dt>
            <dd className="mt-1 text-sm font-semibold">{settings.lines_per_hour}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-faint">New lines</dt>
            <dd className="mt-1 text-sm font-semibold">{settings.auto_approve ? "Publish straight away" : "Need approval"}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="waiting">
        <SectionTitle action={<Link href="/dashboard/requests" className="text-xs font-semibold">See all</Link>}>
          <span id="waiting">Waiting for review</span>
        </SectionTitle>
        {toReview.length === 0 ? (
          <Empty>No requests waiting. Nice.</Empty>
        ) : (
          <div className="space-y-3">
            {toReview.map((r) => (
              <RequestCard key={r.id} request={r} viewerId={viewer.id} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="recent">
        <SectionTitle action={<Link href="/dashboard/activity" className="text-xs font-semibold">See all</Link>}>
          <span id="recent">Recent activity</span>
        </SectionTitle>
        {activity.rows.length === 0 ? <Empty>Nothing yet.</Empty> : <ActivityList rows={activity.rows} />}
      </section>
    </div>
  );
}
