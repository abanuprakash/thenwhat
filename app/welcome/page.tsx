import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/queries";
import { safeNextPath } from "@/lib/sanitize";
import { WelcomeForm } from "@/components/WelcomeForm";
import { AvatarPicker } from "@/components/AvatarPicker";

export const metadata: Metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/welcome");
  const target = safeNextPath(next);
  if (viewer.profile.onboarded) redirect(target);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = user?.user_metadata ?? {};
  const hasGooglePhoto = Boolean(meta.avatar_url ?? meta.picture);

  return (
    <div className="container-narrow">
      <h1 className="mb-2 font-serif text-2xl font-semibold">
        Welcome to Then What<span className="text-gold">?</span>
      </h1>
      <p className="mb-7 text-sm leading-relaxed text-muted">
        Every story here is written one line at a time, by people like you. First, who&apos;s writing? Pick the name and
        handle people will see next to your lines. We&apos;ve filled in suggestions
        {viewer.email ? <> from {viewer.email.replace(/^(.).*(@.*)$/, "$1…$2")}</> : null}; change them if you like.
      </p>
      <div className="card mb-6 p-5">
        <AvatarPicker url={viewer.profile.avatar_url} handle={viewer.profile.handle} hasGooglePhoto={hasGooglePhoto} />
      </div>
      <WelcomeForm handle={viewer.profile.handle} displayName={viewer.profile.display_name ?? ""} next={target} />
    </div>
  );
}
