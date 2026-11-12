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
  const now = Date.now();
  const used = invites.filter((i) => i.used_by || new Date(i.expires_at).getTime() > now).length;

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
          status: i.used_by ? "Joined" : new Date(i.expires_at).getTime() > now ? "Pending" : "Expired",
          expiresAt: i.expires_at,
        }))}
      />
    </div>
  );
}
