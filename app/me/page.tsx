import { redirect } from "next/navigation";
import { getViewer } from "@/lib/queries";

export default async function MePage() {
  const viewer = await getViewer();
  redirect(viewer ? `/u/${viewer.profile.handle}` : "/login?next=/me");
}
