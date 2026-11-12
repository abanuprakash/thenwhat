"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getViewer } from "@/lib/queries";
import { emailSchema, handleSchema, onboardingSchema, profileSchema } from "@/lib/schemas";
import { clientIp, limit, looksLikeBot, TOO_MANY } from "@/lib/security";
import { safeNextPath } from "@/lib/sanitize";
import { fieldErrors, friendly, requireViewer, type FormState } from "@/lib/action-utils";

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

// ── Sign in ────────────────────────────────────────────────────────────

/**
 * Sends a magic link. The reply is the same whether or not the address has an account,
 * so the form can't be used to find out who has signed up.
 */
export async function sendMagicLink(_: FormState, formData: FormData): Promise<FormState> {
  const sent = { ok: "If that address can receive email, a sign-in link is on its way. Open it in this browser." };
  if (!env.emailSignIn) return { error: "Email sign-in is switched off for now. Please continue with Google." };
  if (looksLikeBot(formData)) return sent;

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: ["Enter a valid email address."] } };
  const email = parsed.data;
  const next = safeNextPath(formData.get("next"));

  const ip = await clientIp();
  if (!(await limit("loginPerIp", ip)) || !(await limit("loginPerEmail", hash(email)))) return { error: TOO_MANY };

  const captchaToken = formData.get("cf-turnstile-response");
  if (env.turnstileSiteKey && (typeof captchaToken !== "string" || !captchaToken)) {
    return { error: "Please complete the check above the button." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Always our own address, never one taken from the request's Host header.
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      captchaToken: typeof captchaToken === "string" && captchaToken ? captchaToken : undefined,
      shouldCreateUser: true,
    },
  });
  if (error) {
    console.error("magic link", error.status, error.message);
    if (error.status === 429) return { error: TOO_MANY };
    if (/captcha/i.test(error.message)) return { error: "The check didn't go through. Reload the page and try again." };
    return sent; // don't reveal why it failed
  }
  return sent;
}

// ── First sign-in: name, handle, photo ─────────────────────────────────

export async function checkHandle(raw: string): Promise<{ available: boolean; message: string }> {
  const parsed = handleSchema.safeParse(raw);
  if (!parsed.success) return { available: false, message: parsed.error.issues[0]?.message ?? "Not a valid handle." };
  if (!(await limit("handleCheckPerIp", await clientIp()))) return { available: false, message: TOO_MANY };
  const supabase = await createClient();
  const { data } = await supabase.rpc("handle_available", { p_handle: parsed.data });
  return data ? { available: true, message: `@${parsed.data} is free.` } : { available: false, message: "That handle is taken or reserved." };
}

export async function completeOnboarding(_: FormState, formData: FormData): Promise<FormState> {
  await requireViewer("/welcome");
  if (looksLikeBot(formData)) return { error: "Please try again." };
  const parsed = onboardingSchema.safeParse({ handle: formData.get("handle"), displayName: formData.get("displayName") });
  if (!parsed.success) return fieldErrors(parsed.error);
  const viewer = (await getViewer())!;
  if (!(await limit("profilePerUser", viewer.id))) return { error: TOO_MANY };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_handle: parsed.data.handle,
    p_display_name: parsed.data.displayName,
  });
  if (error) return { error: friendly(error) };
  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

// ── Profile ─────────────────────────────────────────────────────────────

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer("/me");
  const parsed = profileSchema.safeParse({
    handle: formData.get("handle"),
    displayName: formData.get("displayName") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await limit("profilePerUser", viewer.id))) return { error: TOO_MANY };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ handle: parsed.data.handle, display_name: parsed.data.displayName, bio: parsed.data.bio || null })
    .eq("id", viewer.id);
  if (error) return { error: error.code === "23505" ? "That handle is taken." : error.code === "23514" ? "That handle isn't allowed." : friendly(error) };

  revalidatePath("/", "layout");
  if (parsed.data.handle !== viewer.profile.handle) redirect(`/u/${parsed.data.handle}`);
  return { ok: "Saved." };
}

const MAX_UPLOAD = 4 * 1024 * 1024;

/**
 * Profile photos are decoded and re-encoded on the server: only real JPEG/PNG/WebP/GIF images
 * get through, they're cropped to 256×256 WebP, and all metadata (including GPS location) is removed.
 */
export async function uploadAvatar(formData: FormData): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in first." };
  if (!(await limit("avatarPerUser", viewer.id))) return { error: TOO_MANY };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (file.size > MAX_UPLOAD) return { error: "Images can be up to 4 MB." };

  let output: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: 40_000_000, failOn: "error", animated: false });
    const meta = await image.metadata();
    if (!meta.format || !["jpeg", "png", "webp", "gif"].includes(meta.format)) {
      return { error: "Use a JPG, PNG, WebP or GIF image." };
    }
    output = await image.rotate().resize(256, 256, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
  } catch {
    return { error: "That file isn't an image we can read." };
  }

  const supabase = await createClient();
  const path = `${viewer.id}/${randomUUID()}.webp`;
  const { error } = await supabase.storage.from("avatars").upload(path, output, { contentType: "image/webp", upsert: false });
  if (error) return { error: friendly(error) };
  const { error: setError } = await supabase.rpc("set_avatar_url", { p_url: `/media/avatars/${path}` });
  if (setError) return { error: friendly(setError) };
  await removeOldAvatars(viewer.id, path);
  revalidatePath("/", "layout");
  return {};
}

export async function applyGooglePhoto(): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in first." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pic = (user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture) as string | undefined;
  if (!pic) return { error: "There's no Google photo on this account." };
  const { error } = await supabase.rpc("set_avatar_url", { p_url: pic });
  if (error) return { error: friendly(error) };
  await removeOldAvatars(viewer.id, null);
  revalidatePath("/", "layout");
  return {};
}

export async function removeAvatar(): Promise<{ error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in first." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_avatar_url", { p_url: null });
  if (error) return { error: friendly(error) };
  await removeOldAvatars(viewer.id, null);
  revalidatePath("/", "layout");
  return {};
}

async function removeOldAvatars(userId: string, keepPath: string | null) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("avatars").list(userId, { limit: 100 });
  const old = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keepPath);
  if (old.length) await supabase.storage.from("avatars").remove(old);
}
