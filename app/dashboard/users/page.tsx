import type { Metadata } from "next";
import { IntentLink } from "@/components/IntentLink";
import { getPlans, requireAdmin } from "@/lib/queries";
import { UserPlanForm } from "@/components/dashboard/UserPlanForm";
import { cleanSearch, getDashboardUsers, pageFrom, PAGE_SIZE } from "@/lib/dashboard-queries";
import { Empty, FilterBar, Pagination, SearchField, SectionTitle, SelectField } from "@/components/dashboard/ui";
import { RoleSelect } from "@/components/dashboard/RoleSelect";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/format";
import type { Role } from "@/lib/types";

export const metadata: Metadata = { title: "Users" };

const ACCESS: { label: string; reader: boolean; author: boolean; admin: boolean }[] = [
  { label: "Read stories, browse the tree map", reader: true, author: true, admin: true },
  { label: "Vote, follow and report lines (if their plan includes it)", reader: true, author: true, admin: true },
  { label: "Write lines and start stories (plan permitting)", reader: false, author: true, admin: true },
  { label: "Send invites", reader: false, author: true, admin: true },
  { label: "Open the dashboard", reader: false, author: true, admin: true },
  { label: "Ask for more branches or a longer story", reader: false, author: true, admin: true },
  { label: "Review requests and inactivate their own stories", reader: false, author: true, admin: true },
  { label: "Review any request, inactivate any story", reader: false, author: false, admin: true },
  { label: "Change site rules, plans, people's roles and plans", reader: false, author: false, admin: true },
  { label: "Review reported lines, see full activity log", reader: false, author: false, admin: true },
];

function Tick({ on }: { on: boolean }) {
  return on ? (
    <span className="font-bold text-[#2F5420]">
      <span aria-hidden="true">✓</span>
      <span className="sr-only">Yes</span>
    </span>
  ) : (
    <span className="text-faint">
      <span aria-hidden="true">–</span>
      <span className="sr-only">No</span>
    </span>
  );
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireAdmin();
  const q = cleanSearch(sp.q).toLowerCase();
  const role = ["reader", "author", "admin"].includes(sp.role ?? "") ? (sp.role as Role) : "all";
  const page = pageFrom(sp.page);
  const [{ rows, total }, plans] = await Promise.all([getDashboardUsers({ q, role, page }), getPlans(true)]);
  const planOptions = plans.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-10">
      <section>
        <FilterBar action="/dashboard/users">
          <SearchField id="q" label="Search handles" name="q" value={q} placeholder="e.g. noemi" />
          <SelectField
            id="role"
            label="Role"
            name="role"
            value={role}
            options={[
              { value: "all", label: "All roles" },
              { value: "reader", label: "Readers" },
              { value: "author", label: "Verified authors" },
              { value: "admin", label: "Admins" },
            ]}
          />
        </FilterBar>

        {rows.length === 0 ? (
          <Empty>No one matches.</Empty>
        ) : (
          <>
            <ul className="space-y-3 desk:hidden">
              {rows.map((u) => (
                <li key={u.id} className="card p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <Avatar url={u.avatar_url} handle={u.handle} size={36} />
                    <div className="min-w-0">
                      <IntentLink href={`/u/${u.handle}`} className="block truncate text-sm font-semibold text-ink hover:text-gold">
                        @{u.handle}
                      </IntentLink>
                      <span className="text-xs text-faint">
                        joined {timeAgo(u.created_at)}
                        {u.invited_by_handle && <> · invited by @{u.invited_by_handle}</>}
                      </span>
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-muted">
                    {u.lines_written} lines · {u.stories_started} stories · last active {u.last_active ? timeAgo(u.last_active) : "never"}
                  </p>
                  <div className="space-y-2">
                    <RoleSelect handle={u.handle} role={u.role} isSelf={u.id === viewer.id} idPrefix="m" />
                    <UserPlanForm handle={u.handle} plan={u.plan_id} expiresAt={u.plan_expires_at} plans={planOptions} idPrefix="m" />
                  </div>
                </li>
              ))}
            </ul>

            <div className="card hidden overflow-x-auto desk:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">People on Then What and their roles</caption>
                <thead className="border-b border-black/[.08] text-[11px] uppercase tracking-[.04em] text-faint">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Person</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Lines</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Stories</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Last active</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Role and plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[.06]">
                  {rows.map((u) => (
                    <tr key={u.id}>
                      <th scope="row" className="px-4 py-3 font-normal">
                        <div className="flex items-center gap-3">
                          <Avatar url={u.avatar_url} handle={u.handle} size={32} />
                          <div>
                            <IntentLink href={`/u/${u.handle}`} className="font-semibold text-ink hover:text-gold">
                              @{u.handle}
                            </IntentLink>
                            <div className="text-xs text-faint">
                              {u.display_name && u.display_name !== u.handle && <>{u.display_name} · </>}
                              joined {timeAgo(u.created_at)}
                              {u.invited_by_handle && <> · invited by @{u.invited_by_handle}</>}
                            </div>
                          </div>
                        </div>
                      </th>
                      <td className="px-3 py-3">{u.lines_written}</td>
                      <td className="px-3 py-3">{u.stories_started}</td>
                      <td className="px-3 py-3 text-faint">{u.last_active ? timeAgo(u.last_active) : "never"}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <RoleSelect handle={u.handle} role={u.role} isSelf={u.id === viewer.id} idPrefix="d" />
                          <UserPlanForm handle={u.handle} plan={u.plan_id} expiresAt={u.plan_expires_at} plans={planOptions} idPrefix="d" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/dashboard/users" params={{ q: q || undefined, role: role === "all" ? undefined : role }} />
      </section>

      <section aria-labelledby="access">
        <SectionTitle>
          <span id="access">What each role can do</span>
        </SectionTitle>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <caption className="sr-only">Access by role</caption>
            <thead className="border-b border-black/[.08] text-[11px] uppercase tracking-[.04em] text-faint">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Capability</th>
                <th scope="col" className="px-3 py-3 text-center font-semibold">Reader</th>
                <th scope="col" className="px-3 py-3 text-center font-semibold">Author</th>
                <th scope="col" className="px-3 py-3 text-center font-semibold">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[.06]">
              {ACCESS.map((a) => (
                <tr key={a.label}>
                  <th scope="row" className="px-4 py-[10px] font-normal text-ink">{a.label}</th>
                  <td className="px-3 py-[10px] text-center"><Tick on={a.reader} /></td>
                  <td className="px-3 py-[10px] text-center"><Tick on={a.author} /></td>
                  <td className="px-3 py-[10px] text-center"><Tick on={a.admin} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
