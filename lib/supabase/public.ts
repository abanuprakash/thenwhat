import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Supabase client with no session: it never reads or writes cookies, so it acts as a guest
 * (the anon role, under the same RLS as any signed-out visitor).
 * Use it only for public answers that may be cached and shared, such as the live-update
 * check, so a cached response can never carry or refresh anyone's session.
 */
export function createPublicClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
