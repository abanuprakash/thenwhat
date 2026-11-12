/** Plain-language names for plan features, in the order they're shown. */
export const FEATURE_INFO: { key: string; label: string; detail: string; quota?: string }[] = [
  { key: "vote", label: "Vote on lines", detail: "Up and down votes decide which branches rise." },
  { key: "follow", label: "Follow stories", detail: "Keep stories in your Following tab." },
  { key: "report", label: "Report lines", detail: "Flag lines for an admin to review." },
  { key: "write_lines", label: "Write lines", detail: "Continue any story (verified authors)." },
  { key: "edit_lines", label: "Edit your lines", detail: "Fix a line until someone continues it." },
  { key: "start_stories", label: "Start stories", detail: "Open new stories.", quota: "stories" },
  { key: "invite", label: "Invite authors", detail: "Send invite links to new writers.", quota: "invites" },
  { key: "request_more", label: "Ask for more room", detail: "Request extra branches or a longer story." },
  { key: "review_requests", label: "Review requests", detail: "Approve requests for more room on your stories." },
  { key: "story_rules", label: "Story rules", detail: "Set branch and length limits for your stories." },
  { key: "approvals", label: "Approval queue", detail: "Approve lines in your stories and choose auto-publish." },
];
