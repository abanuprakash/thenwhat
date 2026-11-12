import type { Metadata } from "next";
import { getSettings } from "@/lib/dashboard-queries";
import { requireAdmin } from "@/lib/queries";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  return (
    <div>
      <p className="mb-6 text-sm text-muted">
        Site-wide rules. You can give a single story different limits from the Stories tab.
        {settings.updated_at && <span className="text-faint"> Last changed {timeAgo(settings.updated_at)}.</span>}
      </p>
      <SettingsForm settings={settings} />
    </div>
  );
}
