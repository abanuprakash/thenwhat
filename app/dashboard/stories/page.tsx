import type { Metadata } from "next";
import { IntentLink } from "@/components/IntentLink";
import { getEntitlements, getViewer, hasFeature } from "@/lib/queries";
import { cleanSearch, getDashboardStories, pageFrom, PAGE_SIZE } from "@/lib/dashboard-queries";
import { Empty, FilterBar, Pagination, SearchField, SelectField, StatusPill } from "@/components/dashboard/ui";
import { StoryActions } from "@/components/dashboard/StoryActions";
import { formatNum, timeAgo } from "@/lib/format";
import type { DashboardStory, StoryStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Stories" };

function limits(s: DashboardStory) {
  const b = s.effective_max_branches === null ? "∞" : s.effective_max_branches;
  const d = s.effective_max_depth === null ? "∞" : s.effective_max_depth;
  const custom = s.max_branches_override !== null || s.max_depth_override !== null;
  return { b, d, custom };
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; mine?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const viewer = (await getViewer())!;
  const isAdmin = viewer.profile.role === "admin";
  const q = cleanSearch(sp.q);
  const status = sp.status === "active" || sp.status === "inactive" ? (sp.status as StoryStatus) : "all";
  const mine = sp.mine === "1";
  const page = pageFrom(sp.page);
  const [{ rows, total }, ent] = await Promise.all([getDashboardStories(viewer, { q, status, mine, page }), getEntitlements()]);
  // Admins can change any story; starters need the matching plan feature for their own.
  const can = (s: DashboardStory, feature: string) => isAdmin || (s.author_id === viewer.id && hasFeature(ent, feature));

  return (
    <div>
      {!isAdmin && <p className="mb-4 text-sm text-muted">Stories you started. You can make them inactive or bring them back.</p>}
      <FilterBar action="/dashboard/stories">
        <SearchField id="q" label="Search titles" name="q" value={q} placeholder="e.g. Last Signal" />
        <SelectField
          id="status"
          label="Status"
          name="status"
          value={status}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        {isAdmin && (
          <SelectField
            id="mine"
            label="Started by"
            name="mine"
            value={mine ? "1" : ""}
            options={[
              { value: "", label: "Anyone" },
              { value: "1", label: "Me" },
            ]}
          />
        )}
      </FilterBar>

      {rows.length === 0 ? (
        <Empty>No stories match.</Empty>
      ) : (
        <>
          {/* Phones: one card per story */}
          <ul className="space-y-3 desk:hidden">
            {rows.map((s) => {
              const l = limits(s);
              return (
                <li key={s.id} className="card p-4">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <IntentLink href={`/s/${s.slug}`} className="font-serif text-base font-semibold text-ink hover:text-gold">
                      {s.title}
                    </IntentLink>
                    <StatusPill status={s.status} />
                  </div>
                  <p className="mb-2 text-xs text-faint">
                    @{s.author_handle} · {s.genre} · {timeAgo(s.created_at)}
                  </p>
                  <dl className="mb-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-faint">Lines</dt>
                      <dd className="font-semibold">{formatNum(s.line_count)}</dd>
                    </div>
                    <div>
                      <dt className="text-faint">Longest path</dt>
                      <dd className="font-semibold">
                        {s.longest_path} / {l.d}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-faint">Branches/line</dt>
                      <dd className="font-semibold">
                        {l.b}
                        {l.custom && " (custom)"}
                      </dd>
                    </div>
                  </dl>
                  {s.status === "inactive" && s.status_reason && <p className="mb-2 text-xs text-muted">Reason: {s.status_reason}</p>}
                  <p className="mb-2 text-xs text-faint">
                    New lines: {s.effective_auto_approve ? "publish straight away" : "need approval"}
                    {s.pending_lines > 0 && (
                      <>
                        {" · "}
                        <IntentLink href="/dashboard/review">{s.pending_lines} waiting</IntentLink>
                      </>
                    )}
                    {s.pending_requests > 0 && (
                      <>
                        {" · "}
                        <IntentLink href="/dashboard/requests">{s.pending_requests} request(s)</IntentLink>
                      </>
                    )}
                  </p>
                  <StoryActions
                    storyId={s.id}
                    title={s.title}
                    status={s.status}
                    canSetRules={can(s, "story_rules")}
                    canModerate={can(s, "approvals")}
                    autoApprove={s.auto_approve_override}
                    maxBranches={s.max_branches_override}
                    maxDepth={s.max_depth_override}
                    idPrefix="m"
                    adminOverride={isAdmin && s.author_id !== viewer.id}
                  />
                </li>
              );
            })}
          </ul>

          {/* Desktop: a real table */}
          <div className="card hidden overflow-x-auto desk:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Stories, with status, size and limits</caption>
              <thead className="border-b border-black/[.08] text-[11px] uppercase tracking-[.04em] text-faint">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Story</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Lines</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Longest path</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Branches / line</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Waiting</th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[.06]">
                {rows.map((s) => {
                  const l = limits(s);
                  return (
                    <tr key={s.id} className="align-top">
                      <th scope="row" className="px-4 py-3 font-normal">
                        <IntentLink href={`/s/${s.slug}`} className="font-serif text-[15px] font-semibold text-ink hover:text-gold">
                          {s.title}
                        </IntentLink>
                        <div className="text-xs text-faint">
                          @{s.author_handle} · {s.genre} · {timeAgo(s.created_at)}
                        </div>
                        {s.status === "inactive" && s.status_reason && <div className="mt-1 text-xs text-muted">Reason: {s.status_reason}</div>}
                      </th>
                      <td className="px-3 py-3">
                        <StatusPill status={s.status} />
                      </td>
                      <td className="px-3 py-3">{formatNum(s.line_count)}</td>
                      <td className="px-3 py-3">
                        {s.longest_path} of {l.d}
                      </td>
                      <td className="px-3 py-3">
                        {l.b}
                        {l.custom && <span className="block text-[11px] text-faint">custom for this story</span>}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {s.pending_lines > 0 && <IntentLink href="/dashboard/review" className="block">{s.pending_lines} lines</IntentLink>}
                        {s.pending_requests > 0 && <IntentLink href="/dashboard/requests" className="block">{s.pending_requests} requests</IntentLink>}
                        {s.pending_lines === 0 && s.pending_requests === 0 && <span className="text-faint">–</span>}
                        <span className="mt-1 block text-[11px] text-faint">{s.effective_auto_approve ? "Auto-publish" : "Needs approval"}</span>
                      </td>
                      <td className="w-[220px] px-4 py-3">
                        <StoryActions
                          storyId={s.id}
                          title={s.title}
                          status={s.status}
                          canSetRules={can(s, "story_rules")}
                          canModerate={can(s, "approvals")}
                          autoApprove={s.auto_approve_override}
                          maxBranches={s.max_branches_override}
                          maxDepth={s.max_depth_override}
                          idPrefix="d"
                          adminOverride={isAdmin && s.author_id !== viewer.id}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/dashboard/stories"
        params={{ q: q || undefined, status: status === "all" ? undefined : status, mine: mine ? "1" : undefined }}
      />
    </div>
  );
}
