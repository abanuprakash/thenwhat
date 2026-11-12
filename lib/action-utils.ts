import "server-only";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/queries";

export type FormState = { error?: string; ok?: string; fieldErrors?: Record<string, string[] | undefined> };

const GENERIC = "Something went wrong. Please try again.";
// Database internals that should never reach the browser.
const TECHNICAL =
  /(violates|relation|column|constraint|syntax|function|operator|schema|permission denied|null value|invalid input|JWT|PGRST|duplicate key|unique|foreign key|tuple|statement|SQLSTATE|pg_|ltree)/i;

/**
 * Turns an error into a message that's safe to show. Our own database functions raise
 * plain-English messages; anything technical is logged on the server and replaced.
 */
export function friendly(error: { message?: string; code?: string } | null | undefined): string {
  const message = error?.message ?? "";
  if (!message) return GENERIC;
  if (/row-level security/i.test(message) || error?.code === "42501" && TECHNICAL.test(message)) {
    return "You don't have permission to do that.";
  }
  if (/profiles_handle_key|handle.*(taken|exists)/i.test(message)) return "That handle is taken.";
  if (TECHNICAL.test(message) || message.length > 200) {
    console.error("database error", error?.code, message);
    return GENERIC;
  }
  return message;
}

export function fieldErrors(err: z.ZodError): FormState {
  return { fieldErrors: z.flattenError(err).fieldErrors as Record<string, string[] | undefined> };
}

export async function requireViewer(next: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}
