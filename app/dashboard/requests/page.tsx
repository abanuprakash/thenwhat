import type { Metadata } from "next";
import { getViewer } from "@/lib/queries";
import { getRequests, pageFrom, PAGE_SIZE } from "@/lib/dashboard-queries";
import { Empty, FilterBar, Pagination, SelectField } from "@/components/dashboard/ui";
import { RequestCard } from "@/components/dashboard/RequestCard";
import type { RequestStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Requests" };

const STATUSES = ["pending", "approved", "rejected", "cancelled", "all"] as const;

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mine?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const viewer = (await getViewer())!;
  const isAdmin = viewer.profile.role === "admin";
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as RequestStatus | "all") : "pending";
  const mine = sp.mine === "1";
  const page = pageFrom(sp.page);
  const { rows, total } = await getRequests(viewer, { status, mine, page });

  return (
    <div>
      <p className="mb-4 max-w-[640px] text-sm leading-relaxed text-muted">
        When a line has used up its branches, or a path has reached the story&apos;s length limit, authors can ask for more
        room. {isAdmin ? "Admins can review any request." : "You review requests on stories you started; admins can review any."}
      </p>
      <FilterBar action="/dashboard/requests">
        <SelectField
          id="status"
          label="Status"
          name="status"
          value={status}
          options={STATUSES.map((s) => ({ value: s, label: s === "all" ? "All" : s[0].toUpperCase() + s.slice(1) }))}
        />
        <SelectField
          id="mine"
          label="Show"
          name="mine"
          value={mine ? "1" : ""}
          options={[
            { value: "", label: isAdmin ? "Everyone's" : "On my stories + mine" },
            { value: "1", label: "Only mine" },
          ]}
        />
      </FilterBar>
      {rows.length === 0 ? (
        <Empty>No {status === "all" ? "" : status} requests.</Empty>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <RequestCard key={r.id} request={r} viewerId={viewer.id} isAdmin={isAdmin} />
          ))}
        </div>
      )}
      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/dashboard/requests"
        params={{ status: status === "pending" ? undefined : status, mine: mine ? "1" : undefined }}
      />
    </div>
  );
}
