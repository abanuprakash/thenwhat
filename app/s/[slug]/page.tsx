import { notFound, redirect } from "next/navigation";
import { getStoryBySlug } from "@/lib/queries";

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story?.root_line_id) notFound();
  redirect(`/s/${slug}/${story.root_line_id}`);
}
