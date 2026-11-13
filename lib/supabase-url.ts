/**
 * Supabase's dashboard shows a few different addresses (the project URL, the REST URL
 * ending in /rest/v1, and so on). The client libraries want only the project origin,
 * e.g. https://abcd.supabase.co. Anything after it ends up doubled in the request path
 * and Supabase answers "PGRST125 Invalid path specified in request URL".
 * This keeps just the origin, whichever one was pasted.
 */
let warned = false;

export function normalizeSupabaseUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/^["']|["']$/g, "");
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.pathname !== "/" && url.pathname !== "" && !warned) {
      warned = true;
      console.warn(`SUPABASE_URL had a path (${url.pathname}); using ${url.origin} instead.`);
    }
    return url.origin;
  } catch {
    console.error("SUPABASE_URL isn't a valid address. It should look like https://abcd.supabase.co");
    return "";
  }
}
