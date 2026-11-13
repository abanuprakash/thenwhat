/**
 * Hands the signed-in user and profile from the middleware to the page, so a page load checks
 * who you are once instead of twice. Edge-safe (no Node APIs).
 *
 * - Set only by the middleware, only on GET/HEAD requests (page loads and prefetches). The
 *   middleware deletes any copy the browser sends first, so it can't be forged.
 * - Server Actions (POST) don't get it: an action can change the profile mid-request
 *   (onboarding, avatar), so getViewer() fetches fresh there.
 * - "none" means the middleware ran and nobody is signed in.
 */
export const VIEWER_HEADER = "x-tw-viewer";

export type HeaderViewer = { id: string; email: string | null; profile: Record<string, unknown> } | null;

export function encodeViewer(v: HeaderViewer): string {
  if (!v) return "none";
  const bytes = new TextEncoder().encode(JSON.stringify(v));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/** undefined = no header (fetch it yourself); null = signed out. */
export function decodeViewer(raw: string | null): HeaderViewer | undefined {
  if (raw === null) return undefined;
  if (raw === "none") return null;
  try {
    const bin = atob(raw);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as HeaderViewer;
  } catch {
    return undefined;
  }
}
