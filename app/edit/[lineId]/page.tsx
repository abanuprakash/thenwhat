import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements, getLine, getViewer, hasFeature } from "@/lib/queries";
import { EditLineForm } from "@/components/EditLineForm";
import { Locked } from "@/components/Locked";

export const metadata: Metadata = { title: "Edit your line" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPage({ params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  if (!UUID.test(lineId)) notFound();
  const [line, viewer, ent] = await Promise.all([getLine(lineId).catch(() => null), getViewer(), getEntitlements()]);
  // Someone else's line looks exactly like a missing one.
  if (!line || !viewer || line.author_id !== viewer.id) notFound();
  const supabase = await createClient();
  const { data: story } = await supabase.from("stories").select("slug, title").eq("id", line.story_id).single();
  if (!story) notFound();

  return (
    <div className="container-narrow">
      <Link href={`/s/${story.slug}/${lineId}`} className="text-[13px] font-medium">
        ← Back
      </Link>
      <h1 className="mb-2 mt-[14px] font-serif text-2xl font-semibold">Edit your line</h1>
      <p className="mb-5 text-sm text-muted">
        In “{story.title}”. You can change a line until someone continues it. If the story holds lines for approval, your
        change shows once it&apos;s approved; until then readers see the current text.
      </p>
      {!hasFeature(ent, "edit_lines") ? (
        <Locked feature="Editing lines" />
      ) : line.children > 0 ? (
        <p className="panel px-5 py-4 text-sm text-muted">Someone has already continued this line, so it can&apos;t be changed.</p>
      ) : (
        <EditLineForm lineId={lineId} text={line.pending_text ?? line.text} />
      )}
    </div>
  );
}
