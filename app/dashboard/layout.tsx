import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/queries";
import { DashNav } from "@/components/dashboard/DashNav";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: { default: "Dashboard", template: `%s · Dashboard · ${BRAND.name}` } };
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gates this route; checking again here keeps it safe if the matcher ever changes.
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/dashboard");
  const role = viewer.profile.role;
  if (role !== "author" && role !== "admin") redirect("/become-author");
  const isAdmin = role === "admin";

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-28 pt-7 desk:px-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-2xl font-semibold">Dashboard</h1>
        <p className="text-xs text-faint">
          {isAdmin ? `Admin view: everything on ${BRAND.name}.` : "Author view: your stories and your requests."}
        </p>
      </div>
      <DashNav isAdmin={isAdmin} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
