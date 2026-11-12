import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/queries";
import { AcceptInvite } from "@/components/AcceptInvite";

export const metadata: Metadata = { title: "You're invited" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("invite_preview", { p_token: token });
  const preview = (data as { inviter_handle: string; status: string }[] | null)?.[0];
  const viewer = await getViewer();
  const isAuthor = viewer?.profile.role === "author" || viewer?.profile.role === "admin";

  return (
    <div className="container-narrow">
      {!preview ? (
        <>
          <h1 className="mb-3 font-serif text-2xl font-semibold">This invite link isn&apos;t valid</h1>
          <p className="text-sm text-muted">Check that you copied the whole link, or ask for a new one.</p>
        </>
      ) : (
        <>
          <h1 className="mb-3 font-serif text-2xl font-semibold">@{preview.inviter_handle} invited you to write</h1>
          <p className="mb-6 text-sm leading-relaxed text-muted">
            Verified authors can continue any story, start new ones, and invite three people of their own.
          </p>
          {preview.status === "used" && <p className="text-sm text-faint">This invite has already been used.</p>}
          {preview.status === "expired" && <p className="text-sm text-faint">This invite has expired. Ask for a new one.</p>}
          {preview.status === "valid" &&
            (!viewer ? (
              <Link href={`/login?next=/invite/${token}`} className="btn-primary">
                Sign in to accept
              </Link>
            ) : isAuthor ? (
              <p className="text-sm text-faint">You&apos;re already a verified author.</p>
            ) : (
              <AcceptInvite token={token} />
            ))}
        </>
      )}
    </div>
  );
}
