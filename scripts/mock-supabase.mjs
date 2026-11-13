// A small stand-in for Supabase's REST API with demo data, for trying the UI locally without a
// Supabase project: loading states, failure states, screenshots and the failure tests.
//
//   npm run mock                       # http://localhost:54321
//   SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=mock npm run dev
//
// Sign in by setting the cookie "sb-localhost-auth-token" to the demo session (see e2e/failures.spec.ts);
// only this mock accepts it. Settings, all optional:
//   MOCK_ROLE=reader|author|admin   who you are (default admin)
//   MOCK_DELAY=350                  milliseconds added to every data call, to see loading states
//   MOCK_FAIL=story_feed            that table answers with a server error, to see the error screen
//   MOCK_ONBOARDED=0                start on the welcome screen
//   MOCK_LOG=1                      print every request
// Never point a deployed site at this.
import http from "node:http";

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = Date.now();
const iso = (hoursAgo) => new Date(now - hoursAgo * 3600e3).toISOString();

const profiles = [
  { id: uuid(900), handle: "noemi_vance", display_name: "Noemi Vance", bio: "Writes in the margins.", avatar_url: null, role: "author", invited_by: null, created_at: iso(500), onboarded: process.env.MOCK_ONBOARDED !== "0" },
  { id: uuid(901), handle: "kai_ondo", display_name: "Kai Ondo", bio: null, avatar_url: null, role: "author", invited_by: uuid(900), created_at: iso(400) },
];
const P = profiles[0].id, K = profiles[1].id;

let lines = [];
let n = 1;
function add(storyId, parent, text, up, down, author = P, extra = {}) {
  const id = uuid(n++);
  const p = lines.find((l) => l.id === parent);
  const line = {
    id, story_id: storyId, parent_id: parent ?? null, author_id: author, text,
    path: p ? `${p.path}.${id.replace(/-/g, "_")}` : id.replace(/-/g, "_"),
    depth: p ? p.depth + 1 : 0, up, down, score: up / (up + down + 1), children: 0,
    is_complete: false, hidden: false, created_at: iso(30), status: 'published', review_note: null, pending_text: null, pending_text_at: null, edited_at: null, ...extra,
  };
  if (p) p.children++;
  lines.push(line);
  return id;
}
const S1 = uuid(500), S2 = uuid(501), S3 = uuid(502);
const l1 = add(S1, null, "The signal repeated every eleven seconds, and no one on the bridge could explain why it matched Mara's heartbeat.", 340, 28);
const l2a = add(S1, l1, "\"It's not a signal,\" Mara whispered. \"It's a message from the ship I left behind.\"", 290, 18, K);
add(S1, l1, "The captain ordered silence, but Mara was already reaching for the comm switch.", 210, 40);
add(S1, l1, "Systems flagged it as noise. Mara knew better — noise didn't have a pulse.", 150, 35, K);
add(S1, l1, "\"Get me engineering,\" the captain said, voice flat with dread.", 80, 20);
add(S1, l1, "Mara switched off the comm. Some signals weren't meant to be answered.", 54, 30);
add(S1, l1, "Nobody slept that night.", 12, 3);
const l3a = add(S1, l2a, "The ship's registry was hers — the one she'd scuttled seven years ago in the Kessler drift.", 180, 10);
add(S1, l2a, "\"No,\" she said. \"That ship burned. I watched it burn.\"", 140, 22, K);
add(S1, l3a, "Seven years, and the ship had learned to lie just like she had.", 95, 8, P, { is_complete: true });
const l4b = add(S1, l3a, "Mara's hands trembled over the console. Whatever answered back wasn't her ship anymore.", 70, 12, K);
add(S1, l4b, "It was wearing her ship like a coat.", 40, 5);
add(S1, l2a, "The registry pinged back with a name she hadn't used in years.", 0, 0, K, { status: "pending" });
const m1 = add(S2, null, "The last train had already left, so who left the suitcase on the bench?", 210, 14, K);
add(S2, m1, "Officer Kwan crouched beside it. No tag. No ticket stub. Just a heartbeat, faint, from inside.", 130, 9);
const d1 = add(S3, null, "She kept every letter he never sent her, in the order she imagined he'd have sent them.", 250, 12);

const stories = [
  { id: S1, slug: "the-last-signal-abc123", title: "The Last Signal", genre: "Sci-fi", author_id: P, root_line_id: l1, line_count: 12, vote_count: 2100, finished: true, created_at: iso(48) },
  { id: S2, slug: "midnight-at-platform-nine-def456", title: "Midnight at Platform Nine", genre: "Mystery", author_id: K, root_line_id: m1, line_count: 2, vote_count: 980, finished: false, created_at: iso(120) },
  { id: S3, slug: "letters-we-never-sent-0a1b2c", title: "Letters We Never Sent", genre: "Drama", author_id: P, root_line_id: d1, line_count: 1, vote_count: 410, finished: false, created_at: iso(900) },
];
const feed = stories.map((s) => ({
  ...s,
  author_handle: profiles.find((p) => p.id === s.author_id).handle,
  opening_line: lines.find((l) => l.id === s.root_line_id).text,
  trending_score: s.vote_count,
}));
const withAuthor = (l) => ({ ...l, author: { handle: profiles.find((p) => p.id === l.author_id).handle }, story: { slug: stories.find((s) => s.id === l.story_id).slug, title: stories.find((s) => s.id === l.story_id).title } });

function filter(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset"].includes(k)) continue;
    const [op, ...rest] = v.split(".");
    const val = rest.join(".");
    if (op === "eq") out = out.filter((r) => String(r[k]) === val);
    if (op === "in") { const set = val.replace(/[()]/g, "").split(","); out = out.filter((r) => set.includes(String(r[k]))); }
  }
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(",")[0].split(".");
    out = [...out].sort((a, b) => (dir === "desc" ? b[col] - a[col] : a[col] - b[col]));
  }
  const limit = params.get("limit"), offset = params.get("offset");
  if (offset || limit) out = out.slice(Number(offset ?? 0), Number(offset ?? 0) + Number(limit ?? 1e9));
  return out;
}

const ROLE = process.env.MOCK_ROLE || "admin";
profiles[0].role = ROLE;
const settings = { max_branches_per_line: 6, max_depth: 5, lines_per_hour: 10, invite_slots: 3, updated_at: iso(3) };
const requests = [
  { id: uuid(700), kind: "more_branches", story_id: S1, line_id: l1, requester_id: K, message: "There's a whole thread about the engineer we haven't explored. One more branch would let us open it.", status: "pending", granted: null, decision_note: null, decided_at: null, created_at: iso(2), requester: { handle: "kai_ondo" }, decider: null, story: { title: "The Last Signal", slug: "the-last-signal-abc123", author_id: P }, line: { text: lines[0].text, depth: 0 } },
  { id: uuid(701), kind: "more_depth", story_id: S1, line_id: l4b, requester_id: K, message: "This path deserves a real ending, needs two more lines.", status: "approved", granted: 2, decision_note: "Go for it", decided_at: iso(1), created_at: iso(20), requester: { handle: "kai_ondo" }, decider: { handle: "noemi_vance" }, story: { title: "The Last Signal", slug: "the-last-signal-abc123", author_id: P }, line: { text: lines[10].text, depth: 3 } },
];
const dashStories = stories.map((s, i) => ({ ...s, status: i === 2 ? "inactive" : "active", status_reason: i === 2 ? "Under review" : null, status_changed_at: null, author_handle: profiles.find((p) => p.id === s.author_id).handle, max_branches_override: i === 1 ? 3 : null, max_depth_override: null, effective_max_branches: i === 1 ? 3 : 6, effective_max_depth: 5, longest_path: i === 0 ? 5 : 2, pending_requests: i === 0 ? 1 : 0, auto_approve_override: i === 1 ? true : null, effective_auto_approve: i === 1, pending_lines: i === 0 ? 1 : 0 }));
const activity = [
  { id: 1, action: "request.created", details: { kind: "more_branches" }, created_at: iso(2), line_id: l1, actor: { handle: "kai_ondo" }, subject: null, story: { title: "The Last Signal", slug: "the-last-signal-abc123" } },
  { id: 2, action: "line.written", details: { text: "It was wearing her ship like a coat." }, created_at: iso(5), line_id: l4b, actor: { handle: "noemi_vance" }, subject: null, story: { title: "The Last Signal", slug: "the-last-signal-abc123" } },
  { id: 3, action: "story.inactivated", details: { reason: "Under review" }, created_at: iso(9), line_id: null, actor: { handle: "noemi_vance" }, subject: null, story: { title: "Letters We Never Sent", slug: "letters-we-never-sent-0a1b2c" } },
  { id: 4, action: "settings.changed", details: {}, created_at: iso(30), line_id: null, actor: { handle: "noemi_vance" }, subject: null, story: null },
  { id: 5, action: "user.role_changed", details: { from: "reader", to: "author" }, created_at: iso(50), line_id: null, actor: { handle: "noemi_vance" }, subject: { handle: "kai_ondo" }, story: null },
];
const dashUsers = profiles.map((p, i) => ({ ...p, plan_id: i ? "author" : "author_pro", plan_expires_at: i ? iso(-24 * 30) : null, onboarded: true, invited_by_handle: i ? "noemi_vance" : null, lines_written: 7 - i * 3, stories_started: 2 - i, last_active: iso(i + 1) }));
const FEATURES = ["vote","follow","report","write_lines","edit_lines","start_stories","invite","request_more","review_requests","story_rules","approvals"];
const plansData = [
  { id: "free", name: "Free", description: "Read every story, vote, follow and report.", price_inr: 0, sort: 0, active: true, on: ["vote","follow","report"], q: {} },
  { id: "author", name: "Author", description: "Write lines, edit your own, start up to 3 stories and invite 3 people.", price_inr: 199, sort: 1, active: true, on: ["vote","follow","report","write_lines","edit_lines","start_stories","invite","request_more","review_requests"], q: { start_stories: 3, invite: 3 } },
  { id: "author_pro", name: "Author Pro", description: "Unlimited stories, 10 invites, your own story rules and approval queue.", price_inr: 499, sort: 2, active: true, on: FEATURES, q: { invite: 10 } },
].map((p) => ({ ...p, plan_features: FEATURES.map((f) => ({ feature: f, enabled: p.on.includes(f), quota: p.q[f] ?? null })) }));
const ent = () => ({ plan: ROLE === "admin" ? "author_pro" : "author", plan_name: ROLE === "admin" ? "Author Pro" : "Author", plan_expires_at: null,
  features: Object.fromEntries(FEATURES.map((f) => [f, { enabled: ROLE === "admin" || plansData[1].on.includes(f), quota: ROLE === "admin" ? null : (plansData[1].q[f] ?? null) }])),
  stories_started: 2, invites_in_use: 1 });
function capacity(id) {
  const l = lines.find((x) => x.id === id);
  return [{ children: lines.filter((c) => c.parent_id === id).length, branch_limit: settings.max_branches_per_line, depth: l.depth, max_depth: settings.max_depth, story_status: "active", is_complete: l.is_complete }];
}

const MEM_FOLLOWS = []; const MEM_VOTES = [];
http.createServer(async (req, res) => {
  if (process.env.MOCK_LOG) console.log(req.method, req.url.slice(0, 140));
  // MOCK_FAIL=story_feed makes that table answer with a server error (for demoing failure screens).
  if (process.env.MOCK_FAIL && req.url.startsWith("/rest/v1/" + process.env.MOCK_FAIL)) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ message: "boom", code: "XX000" })); }
  const delay = Number(process.env.MOCK_DELAY || 0);
  if (delay && req.url.includes("/rest/v1/")) await new Promise((r) => setTimeout(r, delay));
  const url = new URL(req.url, "http://x");
  let body = "";
  for await (const c of req) body += c;
  const send = (code, data) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(data)); };
  const p = url.pathname;
  if (p.startsWith("/auth/v1/user")) {
    if ((req.headers.authorization ?? "").includes("mock-access")) return send(200, { id: P, aud: "authenticated", role: "authenticated", email: "noemi@example.com", app_metadata: {}, user_metadata: {}, created_at: iso(500) });
    return send(401, { message: "no session" });
  }
  if (p === "/rest/v1/rpc/line_capacity") return send(200, capacity(JSON.parse(body || "{}").p_line));
  if (p === "/rest/v1/rpc/dashboard_stats") return send(200, { scope: ROLE === "admin" ? "site" : "mine", users: ROLE === "admin" ? { reader: 41, author: 7, admin: 1 } : null, stories_active: 2, stories_inactive: 1, lines_7d: 23, pending_requests: 1, my_pending_requests: 0, open_reports: ROLE === "admin" ? 2 : null, pending_lines: 1, my_pending_lines: 0, plans: { free: 41, author: 6, author_pro: 2 } });
  if (p.startsWith("/rest/v1/rpc/invite_slots")) return send(200, 3);
  if (p === "/rest/v1/rpc/review_line") return send(200, JSON.parse(body || "{}").p_approve ? "line.approved" : "line.rejected");
  if (p === "/rest/v1/rpc/my_entitlements") return send(200, ent());
  if (p === "/rest/v1/rpc/check_rate_limit") return send(200, true);
  if (p === "/rest/v1/rpc/handle_available") return send(200, true);
  if (p === "/rest/v1/rpc/lines_per_hour") return send(200, 10);
  if (p === "/rest/v1/rpc/lines_last_hour") return send(200, 0);
  if (p === "/rest/v1/rpc/line_ancestors") {
    const { p_line } = JSON.parse(body || "{}");
    const cur = lines.find((l) => l.id === p_line);
    return send(200, lines.filter((l) => cur.path.startsWith(l.path)).sort((a, b) => a.depth - b.depth));
  }
  if (p === "/rest/v1/rpc/line_subtree") {
    const { p_line } = JSON.parse(body || "{}");
    const cur = lines.find((l) => l.id === p_line);
    return send(200, lines.filter((l) => l.path.startsWith(cur.path)));
  }
  // Remember follows and votes so the demo behaves like the real database.
  if (p === "/rest/v1/follows" || p === "/rest/v1/votes") {
    const mem = p.endsWith("follows") ? MEM_FOLLOWS : MEM_VOTES;
    const key = p.endsWith("follows") ? "story_id" : "line_id";
    if (req.method === "POST") {
      for (const row of [].concat(JSON.parse(body || "[]"))) {
        const i = mem.findIndex((r) => r.user_id === row.user_id && r[key] === row[key]);
        const old = i >= 0 ? mem[i] : null;
        if (i >= 0) mem.splice(i, 1);
        mem.push(row);
        if (key === "line_id") { const l = lines.find((x) => x.id === row.line_id); if (l) { if (old) { if (old.value === 1) l.up--; else l.down--; } if (row.value === 1) l.up++; else l.down++; } }
      }
      return send(201, []);
    }
    if (req.method === "DELETE") {
      const gone = filter(mem, url.searchParams);
      for (const g of gone) { mem.splice(mem.indexOf(g), 1); if (key === "line_id") { const l = lines.find((x) => x.id === g.line_id); if (l) { if (g.value === 1) l.up--; else l.down--; } } }
      return send(204, null);
    }
    const rows = filter(mem, url.searchParams);
    if (req.method === "HEAD" || (req.headers.prefer ?? "").includes("count=")) {
      res.writeHead(200, { "content-type": "application/json", "content-range": rows.length ? `0-${rows.length - 1}/${rows.length}` : "*/0" });
      return res.end(req.method === "HEAD" ? undefined : JSON.stringify(rows));
    }
    const single = (req.headers.accept ?? "").includes("vnd.pgrst.object");
    if (single) return rows[0] ? send(200, rows[0]) : send(406, { message: "not found" });
    return send(200, rows);
  }
  const table = p.replace("/rest/v1/", "");
  const single = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  let rows = { story_feed: feed, stories, lines: lines.map(withAuthor), profiles, follows: [], votes: [], app_settings: [{ ...settings, auto_approve: false }], plans: plansData, limit_requests: requests, dashboard_stories: dashStories, dashboard_users: dashUsers, activity, invites: [], reports: [], profile_stats: profiles.map((x) => ({ id: x.id, handle: x.handle, karma: 1234, lines_written: 7, stories_started: 2, following: 0 })) }[table];
  if (!rows) return send(200, []);
  rows = filter(rows, url.searchParams);
  if (single) return rows[0] ? send(200, rows[0]) : send(406, { message: "not found" });
  send(200, rows);
}).listen(54321, () => console.log("mock on 54321"));
