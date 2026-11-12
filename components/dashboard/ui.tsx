import Link from "next/link";
import type { RequestStatus, StoryStatus } from "@/lib/types";

export function StatCard({ label, value, href, highlight }: { label: string; value: number | string; href?: string; highlight?: boolean }) {
  const body = (
    <>
      <div className={`text-2xl font-bold ${highlight ? "text-gold" : "text-ink"}`}>{value}</div>
      <div className="mt-1 text-xs font-medium text-faint">{label}</div>
    </>
  );
  const cls = `card block px-4 py-4 ${highlight ? "border-gold-edge bg-[#FFFBF2]" : ""} ${href ? "lift" : ""}`;
  return href ? (
    <Link href={href} className={`${cls} text-ink hover:border-black/20 hover:text-ink`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const STATUS_STYLES: Record<RequestStatus | StoryStatus, string> = {
  pending: "bg-cream text-gold",
  approved: "bg-[#E3EEDC] text-[#2F5420]",
  rejected: "bg-[#F4E1DC] text-[#7A2E1C]",
  cancelled: "bg-chip text-muted",
  active: "bg-[#E3EEDC] text-[#2F5420]",
  inactive: "bg-chip text-muted",
};

export function StatusPill({ status }: { status: RequestStatus | StoryStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[.03em] ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="panel px-4 py-6 text-center text-sm text-faint">{children}</p>;
}

/** Previous / next links that keep the current filters. */
export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  params,
}: {
  page: number;
  total: number;
  pageSize: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav aria-label="Pages" className="mt-5 flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn-secondary" rel="prev">
          ← Newer
        </Link>
      ) : (
        <span />
      )}
      <span className="text-xs text-faint">
        Page {page} of {pages} · {total} total
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn-secondary" rel="next">
          Older →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** A plain GET form: works without JavaScript and keeps filters in the URL. */
export function FilterBar({ action, children }: { action: string; children: React.ReactNode }) {
  return (
    <form action={action} method="get" role="search" className="mb-5 flex flex-wrap items-end gap-3">
      {children}
      <button type="submit" className="btn-secondary !py-[9px]">
        Apply
      </button>
    </form>
  );
}

export function SelectField({
  id,
  label,
  name,
  value,
  options,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-1 block">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value} className="field !w-auto !py-2 !text-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SearchField({ id, label, name, value, placeholder }: { id: string; label: string; name: string; value: string; placeholder: string }) {
  return (
    <div className="min-w-[180px] flex-1 desk:max-w-[280px]">
      <label htmlFor={id} className="eyebrow mb-1 block">
        {label}
      </label>
      <input id={id} type="search" name={name} defaultValue={value} placeholder={placeholder} maxLength={60} className="field !py-2 !text-sm" />
    </div>
  );
}

export function limitLabel(n: number | null, unit: string) {
  return n === null ? "No limit" : `${n} ${unit}`;
}
