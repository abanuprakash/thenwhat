import type { ActivityRow } from "@/lib/types";

const KIND: Record<string, string> = { more_branches: "more branches", more_depth: "a longer story" };

function who(h: { handle: string } | null) {
  return h ? `@${h.handle}` : "Someone";
}

function quote(text: unknown) {
  return typeof text === "string" && text ? `“${text.length > 70 ? text.slice(0, 70).trimEnd() + "…" : text}”` : "";
}

/** Turns an activity row into one readable sentence and a link to what it's about. */
export function describeActivity(a: ActivityRow): { text: string; href: string | null } {
  const d = a.details ?? {};
  const actor = a.actor ? `@${a.actor.handle}` : "The system";
  const story = a.story?.title ? `“${a.story.title}”` : "a story";
  const lineHref = a.story && a.line_id ? `/s/${a.story.slug}/${a.line_id}` : null;
  const storyHref = a.story ? `/s/${a.story.slug}` : null;

  switch (a.action) {
    case "user.joined":
      return { text: `${actor} joined Then What`, href: a.actor ? `/u/${a.actor.handle}` : null };
    case "user.role_changed":
      return { text: `${actor} changed ${who(a.subject)} from ${d.from} to ${d.to}`, href: a.subject ? `/u/${a.subject.handle}` : null };
    case "story.created":
      return { text: `${actor} started ${story}`, href: storyHref };
    case "story.inactivated":
      return { text: `${actor} made ${story} inactive${d.reason ? `: ${d.reason}` : ""}`, href: storyHref };
    case "story.reactivated":
      return { text: `${actor} reactivated ${story}`, href: storyHref };
    case "story.limits_changed":
      return {
        text: `${actor} set ${story} to ${d.max_branches ?? "site default"} branches per line and ${d.max_depth ?? "site default"} lines per path`,
        href: storyHref,
      };
    case "line.written":
      return { text: `${actor} wrote ${quote(d.text)} in ${story}`, href: lineHref };
    case "line.hidden":
      return { text: `${actor} hid a line by ${who(a.subject)} in ${story}`, href: lineHref };
    case "line.restored":
      return { text: `${actor} restored a line by ${who(a.subject)} in ${story}`, href: lineHref };
    case "line.ending":
      return { text: `${actor} marked an ending in ${story}`, href: lineHref };
    case "line.reported":
      return { text: `${actor} reported a line in ${story}`, href: lineHref };
    case "line.branch_limit_changed":
      return { text: `A line in ${story} can now have ${d.to ?? "the default number of"} branches`, href: lineHref };
    case "request.created":
      return { text: `${actor} asked for ${KIND[String(d.kind)] ?? "more room"} in ${story}`, href: "/dashboard/requests" };
    case "request.approved":
      return { text: `${actor} approved ${who(a.subject)}'s request for ${KIND[String(d.kind)] ?? "more room"} (+${d.granted})`, href: lineHref };
    case "request.rejected":
      return { text: `${actor} declined ${who(a.subject)}'s request for ${KIND[String(d.kind)] ?? "more room"}`, href: "/dashboard/requests?status=rejected" };
    case "request.cancelled":
      return { text: `${actor} withdrew a request in ${story}`, href: null };
    case "user.plan_changed":
      return { text: `${actor} moved ${who(a.subject)} from the ${d.from} plan to ${d.to}`, href: a.subject ? `/u/${a.subject.handle}` : null };
    case "plan.updated":
      return { text: `${actor} changed what the ${d.name ?? d.plan} plan includes`, href: "/dashboard/plans" };
    case "line.approved":
      return { text: `${actor} published a line by ${who(a.subject)} in ${story}`, href: lineHref };
    case "line.rejected":
      return { text: `${actor} didn't publish a line by ${who(a.subject)} in ${story}`, href: null };
    case "line.edited":
      return { text: `${actor} edited a line in ${story}`, href: lineHref };
    case "line.edit_submitted":
      return { text: `${actor} sent an edit for approval in ${story}`, href: "/dashboard/review" };
    case "line.edit_approved":
      return { text: `${actor} approved ${who(a.subject)}'s edit in ${story}`, href: lineHref };
    case "line.edit_rejected":
      return { text: `${actor} declined ${who(a.subject)}'s edit in ${story}`, href: null };
    case "story.moderation_changed":
      return {
        text: `${actor} set new lines in ${story} to ${d.to === null ? "follow the site setting" : d.to ? "publish straight away" : "need approval"}`,
        href: storyHref,
      };
    case "invite.created":
      return { text: `${actor} created an invite link`, href: null };
    case "invite.accepted":
      return { text: `${actor} accepted ${who(a.subject)}'s invite and became an author`, href: a.actor ? `/u/${a.actor.handle}` : null };
    case "settings.changed":
      return { text: `${actor} changed the site rules`, href: "/dashboard/settings" };
    default:
      return { text: `${actor}: ${a.action}`, href: null };
  }
}
