import type { Metadata } from "next";
import { getViewer } from "@/lib/queries";
import { ACTIVITY_GROUPS, getActivity, pageFrom, PAGE_SIZE } from "@/lib/dashboard-queries";
import { Empty, FilterBar, Pagination, SelectField } from "@/components/dashboard/ui";
import { ActivityList } from "@/components/dashboard/ActivityList";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ type?: string; page?: string }> }) {
  const sp = await searchParams;
  const viewer = (await getViewer())!;
  const type = sp.type && ACTIVITY_GROUPS[sp.type] ? sp.type : "all";
  const page = pageFrom(sp.page);
  const { rows, total } = await getActivity(type, page);

  return (
    <div>
      <p className="mb-4 max-w-[640px] text-sm text-muted">
        {viewer.profile.role === "admin"
          ? "Everything that changes on Then What is recorded here. The log can't be edited or deleted from the app."
          : "What's happened on stories you started, plus your own actions."}
      </p>
      <FilterBar action="/dashboard/activity">
        <SelectField
          id="type"
          label="Show"
          name="type"
          value={type}
          options={Object.entries(ACTIVITY_GROUPS).map(([value, g]) => ({ value, label: g.label }))}
        />
      </FilterBar>
      {rows.length === 0 ? <Empty>Nothing here yet.</Empty> : <ActivityList rows={rows} />}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/dashboard/activity" params={{ type: type === "all" ? undefined : type }} />
    </div>
  );
}
