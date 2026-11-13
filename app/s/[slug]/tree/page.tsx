import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAncestors, getStoryBySlug, getSubtree } from "@/lib/queries";
import { TreeMap } from "@/components/TreeMap";
import { PageTour } from "@/components/Tour";

export const metadata: Metadata = { title: "Story tree" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TreePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ at?: string; from?: string }>;
}) {
  const { slug } = await params;
  const { at, from } = await searchParams;
  const story = await getStoryBySlug(slug);
  if (!story?.root_line_id) notFound();

  const currentId = at && UUID.test(at) ? at : story.root_line_id;
  // Show 6 levels below the chosen starting point (the root by default).
  const startId = from && UUID.test(from) ? from : story.root_line_id;
  const [lines, path] = await Promise.all([getSubtree(startId, 6), getAncestors(currentId).catch(() => [])]);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-24 pt-8 desk:px-6">
      <PageTour id="tree" />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/s/${slug}/${currentId}`} className="text-[13px] font-medium">
            ← Back to reading
          </Link>
          <h1 className="mt-2 font-serif text-[22px] font-semibold">{story.title} · full tree</h1>
        </div>
        <div className="flex items-center gap-[6px] text-xs font-medium text-faint" data-tour="tree-legend">
          <span aria-hidden="true" className="inline-block h-[10px] w-[10px] rounded-full bg-gold" /> your current path
        </div>
      </div>
      {startId !== story.root_line_id && (
        <p className="mb-3 text-xs text-faint">
          Showing part of the tree. <Link href={`/s/${slug}/tree?at=${currentId}`}>Show from the beginning</Link>
        </p>
      )}
      <TreeMap
        slug={slug}
        lines={lines.map((l) => ({
          id: l.id,
          parent_id: l.parent_id,
          text: l.text,
          up: l.up,
          down: l.down,
          children: l.children,
          depth: l.depth,
          is_complete: l.is_complete,
          author: l.author?.handle ?? "",
        }))}
        pathIds={path.map((p) => p.id)}
        currentId={currentId}
        startDepth={lines[0]?.depth ?? 0}
      />
      <p className="mt-3 text-xs text-faint">Drag to pan, scroll or pinch to zoom, click a line to read from there.</p>
    </div>
  );
}
