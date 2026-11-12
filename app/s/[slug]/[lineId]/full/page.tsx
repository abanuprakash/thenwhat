import Link from "next/link";
import { notFound } from "next/navigation";
import { getAncestors, getLine, getStoryBySlug } from "@/lib/queries";

export default async function FullReadPage({ params }: { params: Promise<{ slug: string; lineId: string }> }) {
  const { slug, lineId } = await params;
  const [story, line] = await Promise.all([getStoryBySlug(slug), getLine(lineId).catch(() => null)]);
  if (!story || !line || line.story_id !== story.id) notFound();
  const lines = await getAncestors(lineId);

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-24 pt-9 desk:px-6">
      <div className="mb-[22px] flex flex-wrap items-center justify-between gap-[10px]">
        <Link href={`/s/${slug}/${lineId}`} className="text-[13px] font-medium">
          ← Back to branches
        </Link>
        <span className="text-xs font-medium text-faint">
          {lines.length} {lines.length === 1 ? "line" : "lines"} on this path
        </span>
      </div>
      <h1 className="mb-[26px] font-serif text-[26px] font-semibold">{story.title}</h1>
      {lines.map((l, i) => (
        <div key={l.id} className="animate-stagger mb-[22px]" style={{ "--i": i } as React.CSSProperties}>
          <p className="mb-[6px] font-serif text-[19px] leading-[1.7] text-ink">{l.text}</p>
          <span className="text-[11px] font-medium text-faint">— @{l.author?.handle}</span>
        </div>
      ))}
      {line.is_complete && <div className="badge-gold mt-[6px] !px-[10px] !py-1 !text-[10px]">The end, on this path</div>}
      <div className="mt-[30px] border-t border-black/[.08] pt-5">
        <Link href={`/s/${slug}/${lineId}`} className="btn-primary">
          Then what? See where it branches
        </Link>
      </div>
    </div>
  );
}
