"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canWrite, getEntitlements, getViewer, hasFeature } from "@/lib/queries";
import {
  createStorySchema,
  editLineSchema,
  limitRequestSchema,
  reportSchema,
  uuid,
  voteSchema,
  writeLineSchema,
} from "@/lib/schemas";
import { clientIp, limit, looksLikeBot, TOO_MANY } from "@/lib/security";
import { fieldErrors, friendly, requireViewer, type FormState } from "@/lib/action-utils";
import type { VoteValue } from "@/lib/types";

/*
 * Every action here checks, in order: the input (Zod), who's asking, their plan,
 * a rate limit, and then calls the database, which checks the same rules again.
 */

const PLAN_MESSAGE = "That isn't part of your plan. See Pricing to upgrade.";

// ── Voting ──────────────────────────────────────────────────────────────

/** Toggle a vote: same direction again removes it, the other direction flips it. */
export async function vote(lineId: string, value: VoteValue): Promise<{ error?: string }> {
  const parsed = voteSchema.safeParse({ lineId, value });
  if (!parsed.success) return { error: "Invalid vote." };
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to vote." };
  if (!hasFeature(await getEntitlements(), "vote")) return { error: PLAN_MESSAGE };
  if (!(await limit("votePerUser", viewer.id))) return { error: TOO_MANY };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("votes")
    .select("value")
    .eq("user_id", viewer.id)
    .eq("line_id", parsed.data.lineId)
    .maybeSingle();

  const result =
    existing?.value === parsed.data.value
      ? await supabase.from("votes").delete().eq("user_id", viewer.id).eq("line_id", parsed.data.lineId)
      : await supabase
          .from("votes")
          .upsert({ user_id: viewer.id, line_id: parsed.data.lineId, value: parsed.data.value }, { onConflict: "user_id,line_id" });

  if (result.error) return { error: friendly(result.error) };
  revalidatePath("/s/[slug]/[lineId]", "page");
  return {};
}

// ── Following ───────────────────────────────────────────────────────────

export async function toggleFollow(storyId: string, follow: boolean): Promise<{ error?: string }> {
  if (!uuid.safeParse(storyId).success || typeof follow !== "boolean") return { error: "Invalid request." };
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to follow stories." };
  if (!hasFeature(await getEntitlements(), "follow")) return { error: PLAN_MESSAGE };
  if (!(await limit("followPerUser", viewer.id))) return { error: TOO_MANY };
  const supabase = await createClient();
  const { error } = follow
    ? await supabase.from("follows").upsert({ user_id: viewer.id, story_id: storyId }, { ignoreDuplicates: true })
    : await supabase.from("follows").delete().eq("user_id", viewer.id).eq("story_id", storyId);
  if (error) return { error: friendly(error) };
  revalidatePath("/");
  return {};
}

// ── Writing ─────────────────────────────────────────────────────────────

export async function writeLine(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = writeLineSchema.safeParse({ parentId: formData.get("parentId"), text: formData.get("text") });
  if (!parsed.success) return fieldErrors(parsed.error);
  const viewer = await requireViewer(`/write/${parsed.data.parentId}`);
  if (looksLikeBot(formData)) return { error: "Please try again." };
  if (!canWrite(viewer)) return { error: "Only verified authors can write lines. Ask an author for an invite." };
  if (!hasFeature(await getEntitlements(), "write_lines")) return { error: PLAN_MESSAGE };

  const supabase = await createClient();
  const [{ data: recent }, { data: perHour }] = await Promise.all([
    supabase.rpc("lines_last_hour", { uid: viewer.id }),
    supabase.rpc("lines_per_hour"),
  ]);
  if ((recent ?? 0) >= (perHour ?? 10)) {
    return { error: `You've written ${perHour} lines in the last hour. Take a breath and come back soon.` };
  }

  const { data: parent } = await supabase
    .from("lines")
    .select("story_id, is_complete, story:stories!lines_story_id_fkey(slug)")
    .eq("id", parsed.data.parentId)
    .maybeSingle();
  if (!parent) return { error: "That line no longer exists." };
  if (parent.is_complete) return { error: "This path has been marked complete." };

  const { data: line, error } = await supabase
    .from("lines")
    .insert({
      story_id: parent.story_id,
      parent_id: parsed.data.parentId,
      author_id: viewer.id,
      text: parsed.data.text,
      path: "pending", // set by the database trigger
    })
    .select("id")
    .single();
  if (error) return { error: friendly(error) };

  const slug = (parent.story as unknown as { slug: string }).slug;
  revalidatePath(`/s/${slug}`, "layout");
  redirect(`/s/${slug}/${line.id}`);
}

export async function editLine(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = editLineSchema.safeParse({ lineId: formData.get("lineId"), text: formData.get("text") });
  if (!parsed.success) return fieldErrors(parsed.error);
  const viewer = await requireViewer(`/edit/${parsed.data.lineId}`);
  if (looksLikeBot(formData)) return { error: "Please try again." };
  if (!hasFeature(await getEntitlements(), "edit_lines")) return { error: PLAN_MESSAGE };
  if (!(await limit("profilePerUser", `edit:${viewer.id}`))) return { error: TOO_MANY };

  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("edit_line", { p_line: parsed.data.lineId, p_text: parsed.data.text });
  if (error) return { error: friendly(error) };
  const { data: line } = await supabase
    .from("lines")
    .select("story:stories!lines_story_id_fkey(slug)")
    .eq("id", parsed.data.lineId)
    .single();
  const slug = (line?.story as unknown as { slug: string } | null)?.slug;
  revalidatePath("/", "layout");
  if (result === "line.edit_submitted") {
    return { ok: "Saved. Your change will show once the story's starter or an admin approves it." };
  }
  redirect(slug ? `/s/${slug}/${parsed.data.lineId}` : "/");
}

export async function createStory(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = createStorySchema.safeParse({
    title: formData.get("title"),
    genre: formData.get("genre"),
    firstLine: formData.get("firstLine"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const viewer = await requireViewer("/new");
  if (looksLikeBot(formData)) return { error: "Please try again." };
  if (!canWrite(viewer)) return { error: "Only verified authors can start stories." };
  if (!hasFeature(await getEntitlements(), "start_stories")) return { error: PLAN_MESSAGE };

  const supabase = await createClient();
  const { data: slug, error } = await supabase.rpc("create_story", {
    p_title: parsed.data.title,
    p_genre: parsed.data.genre,
    p_first_line: parsed.data.firstLine,
  });
  if (error) return { error: friendly(error) };
  revalidatePath("/");
  redirect(`/s/${slug}`);
}

export async function markComplete(lineId: string, slug: string): Promise<{ error?: string }> {
  if (!uuid.safeParse(lineId).success || !/^[a-z0-9-]{1,80}$/.test(slug)) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_complete", { p_line: lineId });
  if (error) return { error: friendly(error) };
  revalidatePath(`/s/${slug}`, "layout");
  revalidatePath("/");
  return {};
}

// ── Reports ─────────────────────────────────────────────────────────────

export async function reportLine(lineId: string, reason: string): Promise<{ error?: string }> {
  const parsed = reportSchema.safeParse({ lineId, reason });
  if (!parsed.success) return { error: "Invalid report." };
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in to report a line." };
  if (!hasFeature(await getEntitlements(), "report")) return { error: PLAN_MESSAGE };
  if (!(await limit("reportPerUser", viewer.id))) return { error: TOO_MANY };
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .insert({ line_id: parsed.data.lineId, reporter_id: viewer.id, reason: parsed.data.reason || null });
  if (error && error.code !== "23505") return { error: friendly(error) };
  return {};
}

// ── Invites ─────────────────────────────────────────────────────────────

export async function createInvite(): Promise<{ token?: string; error?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Sign in first." };
  if (!hasFeature(await getEntitlements(), "invite")) return { error: PLAN_MESSAGE };
  if (!(await limit("invitePerUser", viewer.id))) return { error: TOO_MANY };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invite");
  if (error) return { error: friendly(error) };
  revalidatePath("/dashboard/invites");
  return { token: data as string };
}

const ACCEPT_MESSAGES: Record<string, string> = {
  accepted: "You're now a verified author.",
  already_author: "You're already a verified author.",
  own_invite: "That's your own invite. Send it to someone else.",
  used: "This invite has already been used.",
  expired: "This invite has expired. Ask for a new one.",
  invalid: "This invite link isn't valid.",
};

export async function acceptInvite(token: string): Promise<{ status: string; message: string }> {
  if (typeof token !== "string" || !/^[0-9a-f]{32}$/.test(token)) return { status: "invalid", message: ACCEPT_MESSAGES.invalid };
  await requireViewer(`/invite/${token}`);
  if (!(await limit("acceptInvitePerIp", await clientIp()))) return { status: "error", message: TOO_MANY };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) return { status: "error", message: friendly(error) };
  const status = data as string;
  revalidatePath("/", "layout");
  return { status, message: ACCEPT_MESSAGES[status] ?? ACCEPT_MESSAGES.invalid };
}

// ── Asking for more room ────────────────────────────────────────────────

export async function requestLimitIncrease(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = limitRequestSchema.safeParse({
    lineId: formData.get("lineId"),
    kind: formData.get("kind"),
    message: formData.get("message"),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const viewer = await getViewer();
  if (!viewer || !canWrite(viewer)) return { error: "Only verified authors can ask for more room." };
  if (looksLikeBot(formData)) return { error: "Please try again." };
  if (!hasFeature(await getEntitlements(), "request_more")) return { error: PLAN_MESSAGE };
  if (!(await limit("requestPerUser", viewer.id))) return { error: TOO_MANY };

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_limit_increase", {
    p_line: parsed.data.lineId,
    p_kind: parsed.data.kind,
    p_message: parsed.data.message,
  });
  if (error) return { error: friendly(error) };
  revalidatePath("/s/[slug]/[lineId]", "page");
  revalidatePath("/dashboard", "layout");
  return { ok: "Request sent. You'll see the answer under Dashboard → Requests." };
}

export async function cancelRequest(requestId: string): Promise<{ error?: string }> {
  if (!uuid.safeParse(requestId).success) return { error: "Invalid request." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_limit_request", { p_request: requestId });
  if (error) return { error: friendly(error) };
  revalidatePath("/dashboard", "layout");
  return {};
}
