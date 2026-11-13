import type { Metadata } from "next";
import { getEntitlements, getMyInvites, getViewer, hasFeature } from "@/lib/queries";
import { Locked } from "@/components/Locked";
import { InviteManager } from "@/components/InviteManager";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Invites" };

export default async function InvitesPage() {
  const viewer = (await getViewer())!;
  const [invites, ent] = await Promise.all([getMyInvites(viewer), getEntitlements()]);
  const isAdmin = viewer.profile.role === "admin";
  if (!hasFeature(ent, "invite")) {
    return <Locked feature="Sending invites" />;
  }
  const slots = ent?.features.invite?.quota ?? null;
  const used = countUsedSlots(invites);

  return (
    <div className="max-w-[620px]">
      <p className="mb-6 text-sm text-faint">
        {isAdmin || slots === null ? "Your plan has unlimited invites." : `${Math.max(slots - used, 0)} of ${slots} invite slots available on your ${ent?.plan_name} plan`}
      </p>
      <InviteManager
        siteUrl={env.siteUrl}
        canCreate={isAdmin || slots === null || used < slots}
        invites={invites.map((i) => ({
          token: i.token,
          invitee: i.invitee?.handle ?? null,
          status: i.used_by ? "Joined" : isLive(i.expires_at) ? "Pending" : "Expired",
          expiresAt: i.expires_at,
        }))}
      />
    </div>
  );
}

/** Whether an invite link still works. */
function isLive(expiresAt: string) {
  return new Date(expiresAt).getTime() > Date.now();
}

/** Invites that take a slot: accepted ones, and ones that haven't expired yet. */
function countUsedSlots(invites: { used_by: string | null; expires_at: string }[]) {
  return invites.filter((i) => i.used_by || isLive(i.expires_at)).length;
}
