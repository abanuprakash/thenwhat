// Generated from the "Then What: every feature, explained" guide. Keep it in step with the product:
// when a feature changes, update its chapter here (and the screenshots in public/media/guide/).
import Link from "next/link";
import { Chapter, Chapters } from "@/components/StoryPage";
import { GuideClip, GuideFigure, GuideTable } from "@/components/guide/GuideMedia";

/** The guide's chapters, in order, for the contents list. */
export const GUIDE_CHAPTERS = [
  { id: "start", title: "Start here" },
  { id: "roles", title: "Who can do what" },
  { id: "reading", title: "Reading a story" },
  { id: "writing", title: "Writing" },
  { id: "approvals", title: "Approvals, editing and asking for more room" },
  { id: "account", title: "Your account and profile" },
  { id: "help", title: "Help as you go: tours and tips" },
  { id: "invites", title: "Invites and plans" },
  { id: "dashboard", title: "The dashboard" },
  { id: "speed", title: "Live updates and speed" },
  { id: "errors", title: "When things go wrong" },
  { id: "safety", title: "Safety, security and privacy" },
  { id: "footer", title: "Around the story: footer and story pages" },
  { id: "numbers", title: "The numbers" },
  { id: "glossary", title: "Glossary" },
  { id: "next", title: "What's coming" },
] as const;

export function GuideBody() {
  return (
    <Chapters label="Every feature, explained">
      <Chapter n={1} id="start" title="Start here" line="Every story here began as one line, waiting for someone to ask what came next.">
        <p>Every story on Then What is a tree of lines. It starts with one opening line; each new line continues the one before it, and any line can have several continuations, called <strong className="font-semibold text-ink">branches</strong>. Reading from the opening line down one set of branches gives you a <strong className="font-semibold text-ink">path</strong>, one complete version of the story.</p>
<ol className="guide-steps">
<li><strong className="font-semibold text-ink">Someone opens a story.</strong> An author writes a title, picks a genre and writes the first line.</li>
<li><strong className="font-semibold text-ink">Others continue it.</strong> Invited authors read the latest line and ask themselves <em>then what?</em> Each answer is a new line, up to 280 characters.</li>
<li><strong className="font-semibold text-ink">The story splits.</strong> When two people imagine different next lines, both are kept. The story now has two branches.</li>
<li><strong className="font-semibold text-ink">Readers vote.</strong> Up and down votes rank the branches, so the best ones sit at the top and new readers find them first.</li>
<li><strong className="font-semibold text-ink">A path ends.</strong> The story&apos;s starter can mark a line as the ending, or the story reaches its length limit. Readers can then read that path from start to finish as one piece of prose.</li>
</ol>
<p>You don&apos;t need an account to read. You need one to vote or follow, and an invite plus an author plan to write.</p>
<p>The picture below is the tree map of the demo story <em>The Last Signal</em>: every box is a line, and each fork is a branch.</p>
        <GuideFigure src="/media/guide/tree-desk.webp" alt="The tree map of The Last Signal, with every line as a box and branches fanning out" width={1400} height={875} />
      </Chapter>
      <Chapter n={2} id="roles" title="Who can do what" line="Some come to read, some to write, and a few to keep the lights on.">
        <p>There are four kinds of visitor. Your <strong className="font-semibold text-ink">role</strong> says who you are (reader, author or admin); your <strong className="font-semibold text-ink">plan</strong> says which features you have switched on (see <a href="#invites">Invites and plans</a>).</p>
        <GuideTable head={["", "Guest (not signed in)", "Reader", "Author", "Admin"]} rows={[
          [<>How you get here</>, <>Just visit</>, <>Sign in with Google</>, <>Accept an invite link</>, <>Made admin by another admin</>],
          [<>Read every published story, path, full story and tree map</>, <>Yes</>, <>Yes</>, <>Yes</>, <>Yes</>],
          [<>Vote, follow, report a line</>, <>No</>, <>Yes (Free plan)</>, <>Yes</>, <>Yes</>],
          [<>Write and edit lines, start stories</>, <>No</>, <>No</>, <>Yes, on an Author plan</>, <>Yes</>],
          [<>Invite new authors</>, <>No</>, <>No</>, <>Author plan: 3, Author Pro: 10</>, <>Yes</>],
          [<>Approve lines and requests in your stories</>, <>No</>, <>No</>, <>Author Pro (approvals); Author (requests)</>, <>Every story</>],
          [<>Dashboard</>, <>No</>, <>No</>, <>Review, requests, stories, activity, invites</>, <>Everything, plus users, plans, reports, settings</>],
          [<>Bottom bar on phones</>, <>Home, Write, Sign in</>, <>Home, Write, Profile</>, <>Home, Write, Profile, Dashboard</>, <>Same as author</>],
        ]} />
        <p>Admins have every feature, whatever their plan. A plan can have an end date; when it passes, the person drops back to Free automatically.</p>
      </Chapter>
      <Chapter n={3} id="reading" title="Reading a story" line="Open any story and you're standing at a fork in the road.">
        <p>Reading is open to everyone, no account needed.</p>
<h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">The home feed</h3>
<p>The home page lists stories in five tabs: <strong className="font-semibold text-ink">Trending</strong> (votes and new lines, weighted towards recent activity), <strong className="font-semibold text-ink">New</strong>, <strong className="font-semibold text-ink">Top</strong> (most votes), <strong className="font-semibold text-ink">Finished</strong> (stories with a completed path) and <strong className="font-semibold text-ink">Following</strong> (stories you starred, once you&apos;re signed in). Each card shows the opening line, the genre, the vote count and how many branches it has. The tabs switch instantly, and the list keeps your place.</p>
        <GuideFigure src="/media/guide/home-guest-desk.webp" alt="The home feed for a guest, with the Trending tab open" width={1400} height={875} />
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">The reading page</h3>
<p>Opening a story shows one line at a time, with everything you need around it:</p>
<ul>
<li><strong className="font-semibold text-ink">The path so far</strong>: small crumbs at the top show the lines that led here; tap any of them to step back.</li>
<li><strong className="font-semibold text-ink">The line itself</strong>, its author and its score, with up and down vote arrows.</li>
<li><strong className="font-semibold text-ink">Then what?</strong>: the branches that continue from this line, ranked by readers. Ranking uses a fair formula (the lower bound of a confidence interval), so one early vote can&apos;t push a branch to the top; it takes readers agreeing. The first five show; <em>Show more branches</em> loads the rest.</li>
<li><strong className="font-semibold text-ink">Your path</strong> (on wide screens): a mini map of where you are, and a link to the full tree map.</li>
<li><strong className="font-semibold text-ink">Your turn: write what happens</strong>, for authors, when the line has room for another branch.</li>
<li><strong className="font-semibold text-ink">Read full story from here</strong> and <strong className="font-semibold text-ink">Follow story</strong> buttons.</li>
<li>Small counters such as <em>4 of 6 branches used · line 3 of 5</em>, each with an (i) tip that explains the limit.</li>
</ul>
        <GuideFigure src="/media/guide/reading-desk.webp" alt="A reading page: the path crumbs, the line, follow and full-story buttons, the ranked branches and the mini map" width={1400} height={875} />
        <p>Votes and follows land instantly, with a small animation, and never reload the page. If a line is full (every branch slot taken, or the path is at its length limit), the page says so and offers a way forward, like <em>Ask for another branch</em>.</p>
        <GuideClip src="/media/guide/read-clip.mp4" label="Clip: scrolling to the branches, voting, following, opening a branch, then the tree map" width={1180} height={760} />
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">The full story</h3>
<p><em>Read full story from here</em> shows the whole path, from the opening line to where you are, as continuous prose with each author&apos;s handle. It&apos;s the easiest way to read a finished path.</p>
        <GuideFigure src="/media/guide/full-desk.webp" alt="A path read as one piece of prose" width={1400} height={875} />
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">The tree map</h3>
<p>The tree map draws every line of a story as a box, with branches fanning out. Drag to move around, scroll or use the + and − buttons to zoom, and click any box to jump to that line. Your current path is highlighted.</p>
<h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">On a phone</h3>
<p>The same pages fit a phone: branches stack as cards, the mini map moves under the line, and a bar at the bottom (Home, Write, Profile, Dashboard) tucks away while you scroll down to read and comes back when you scroll up.</p>
        <GuideFigure src="/media/guide/reading-phone.webp" alt="The reading page on a phone, with the bottom bar" width={520} height={1059} phone />
      </Chapter>
      <Chapter n={4} id="writing" title="Writing" line="Your turn. Two hundred and eighty characters, and the story goes wherever you take it.">
        <p>Writing is for authors: people who accepted an invite and have a plan that includes <em>Write lines</em>. The big <strong className="font-semibold text-ink">Write</strong> button sits in the middle of the phone bar and as <em>+ Start a story</em> in the header on wide screens.</p>
<h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Adding the next line</h3>
<ol className="guide-steps">
<li>On any line with room, press <strong className="font-semibold text-ink">Your turn: write what happens</strong>.</li>
<li>The write page shows the line you&apos;re continuing, which line number yours will be, and how many branches are still open under it (for example <em>This will be line 4 of 5 on this path · 4 of 6 branches still open</em>).</li>
<li>Type up to 280 characters. A counter shows what&apos;s left, and the button stays off until there&apos;s something to send.</li>
<li>Press <strong className="font-semibold text-ink">Add my line</strong>. It appears straight away, or waits for approval if the story holds new lines (see the next section).</li>
</ol>
<p>If the line you were continuing already has a branch, yours simply becomes another branch beside it. That&apos;s how stories split: there&apos;s no separate &quot;branch&quot; button.</p>
        <GuideClip src="/media/guide/write-clip.mp4" label="Clip on a phone: from a line to the write page, typing a new line and adding it" width={412} height={838} phone />
        <p><strong className="font-semibold text-ink">Stuck?</strong> <em>Get a spark</em> offers a random story prompt, like <em>The lights go out</em> or <em>A letter arrives, years too late</em>. Press it again for another.</p>
<p>If the save doesn&apos;t go through (say, your connection drops), what you typed stays in the box so you can try again.</p>
<h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Starting a new story</h3>
<p><em>+ Start a story</em> opens a form with a <strong className="font-semibold text-ink">title</strong>, a <strong className="font-semibold text-ink">genre</strong> (Sci-fi, Mystery, Fantasy, Drama, Literary, Horror or Comedy) and the <strong className="font-semibold text-ink">opening line</strong>. The Author plan allows 3 stories; Author Pro has no limit.</p>
        <GuideFigure src="/media/guide/new-desk.webp" alt="Starting a new story: title, genre and the opening line" width={1400} height={875} />
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Ending a path</h3>
<p>The story&apos;s starter (or an admin) can press <strong className="font-semibold text-ink">Mark this ending as complete</strong> on any line. That path is then closed to new lines, and the story appears in the Finished tab.</p>
      </Chapter>
      <Chapter n={5} id="approvals" title="Approvals, editing and asking for more room" line="Even the wildest story needs someone keeping an eye on the thread.">
        <p>These three features let a story&apos;s starter keep the thread without blocking anyone.</p>
<h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Approving new lines</h3>
<p>By default, new lines go live straight away. An admin can switch the whole site to <em>Need approval</em>, and a starter on Author Pro (or an admin) can choose per story. When a story holds lines:</p>
<ul>
<li>Your line shows as <strong className="font-semibold text-ink">waiting for approval</strong>. Only you, the starter and admins can see it.</li>
<li>It still takes a branch slot, so approvals can never push a line past its limit.</li>
<li>The starter and admins see it under <strong className="font-semibold text-ink">Dashboard → Review</strong>. Approving asks first, in a small dialog (a sheet on phones) that says exactly what will happen: <em>the line goes live, credited to you; readers can vote on it, and writers can continue from it</em>. Rejecting lets them add a note to the writer.</li>
<li>Lines written by the starter or an admin skip the queue.</li>
</ul>
        <div className="guide-pair"><GuideFigure src="/media/guide/review-confirm-desk.webp" alt="Approving a line on a wide screen: the dialog says what will happen" width={1400} height={875} /><GuideFigure src="/media/guide/review-sheet-phone.webp" alt="The same step on a phone, as a sheet" width={520} height={1059} phone /></div>
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Editing your own line</h3>
<p>Authors can fix a line <strong className="font-semibold text-ink">until someone continues it</strong>. After that, it&apos;s part of someone else&apos;s story too, so it&apos;s locked. In a story that holds lines, an edit waits for approval and readers keep seeing the old text until then.</p>
<h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Asking for more room</h3>
<p>Stories can have limits: how many branches each line can have, and how many lines a path can run. When a line is full, an author can press <strong className="font-semibold text-ink">Ask for another branch</strong> (or ask for a longer path) and explain why. The request goes to the starter and admins under <strong className="font-semibold text-ink">Dashboard → Requests</strong>, where they can grant one or more extra slots, or decline with a note.</p>
        <GuideFigure src="/media/guide/reading-branches-desk.webp" alt="A full line offers Ask for another branch" width={1400} height={875} />
      </Chapter>
      <Chapter n={6} id="account" title="Your account and profile" line="Every character needs a name. Here's how you get yours.">
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Signing in</h3>
<p>Press <strong className="font-semibold text-ink">Sign in</strong> and choose <strong className="font-semibold text-ink">Continue with Google</strong>. An email sign-in link can also be switched on. When the bot check is switched on, a quick Cloudflare check runs first. The sign-in page links to the house rules and privacy policy so you know what you&apos;re agreeing to.</p>
        <GuideFigure src="/media/guide/login-desk.webp" alt="The sign-in page" width={1400} height={875} />
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Your first visit</h3>
<p>The first time you sign in, a welcome page asks you to pick a <strong className="font-semibold text-ink">handle</strong>, your @name on every line you write. Handles are 3–24 characters (letters, numbers, dots and underscores) and must start and end with a letter or number. The page checks as you type whether a handle is free. You can also add a display name and a short bio now or later.</p>
<h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Your profile</h3>
<p>Your profile at <em>/u/your-handle</em> shows:</p>
<ul>
<li>your photo, name, handle and role badge;</li>
<li>four numbers, each with an (i) tip: <strong className="font-semibold text-ink">karma</strong> (the up votes minus down votes your lines have earned), <strong className="font-semibold text-ink">lines written</strong>, <strong className="font-semibold text-ink">stories started</strong> and <strong className="font-semibold text-ink">stories followed</strong>;</li>
<li>the stories you started and your recent lines;</li>
<li>on your own profile only: <strong className="font-semibold text-ink">Edit profile</strong>, your plan, a <strong className="font-semibold text-ink">Tours</strong> panel (more below) and <strong className="font-semibold text-ink">Sign out</strong>.</li>
</ul>
        <GuideFigure src="/media/guide/profile-desk.webp" alt="A profile: photo, handle, role, the four numbers, stories started and recent lines" width={1400} height={875} />
        <p>To change your photo, upload a JPEG, PNG, WebP or GIF of up to 4 MB. It&apos;s cropped to a square and resized, and nothing else is read from the file. You can also go back to your Google photo or remove it.</p>
      </Chapter>
      <Chapter n={7} id="help" title="Help as you go: tours and tips" line="Lost? Someone left notes in the margins.">
        <p>Nobody needs a manual. Two things explain the site from inside it.</p>
<h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Guided tours</h3>
<p>The first time you open a page that needs explaining, a short tour starts: a few cards, each with a small drawing, that point at the part of the page they describe while the rest dims. Tours exist for the home page, a story, the tree map, writing a line, starting a story, the dashboard, settings and your profile, and each is written for your role, so a reader, an author and an admin hear different things on the same page.</p>
<ul>
<li><strong className="font-semibold text-ink">Next</strong>, <strong className="font-semibold text-ink">Back</strong>, <strong className="font-semibold text-ink">Skip tour</strong> and <strong className="font-semibold text-ink">Done</strong> buttons; the arrow keys and Esc work too.</li>
<li>On wide screens the card sits beside what it points at; on phones it&apos;s a sheet at the bottom.</li>
<li>Each tour plays once. Signed in, the tours you&apos;ve seen are saved to your account, so they don&apos;t repeat on another device; as a guest, they&apos;re remembered in your browser.</li>
<li><strong className="font-semibold text-ink">Replay any time</strong> with the <strong className="font-semibold text-ink">?</strong> button at the top of every page, or from the <strong className="font-semibold text-ink">Tours</strong> panel on your profile, which lists every tour for your role with a <em>Take it</em> button, plus <strong className="font-semibold text-ink">Show all tours again</strong>.</li>
<li>If you&apos;ve asked your device for less motion, cards appear without sliding.</li>
</ul>
        <GuideClip src="/media/guide/tours-clip.mp4" poster="/media/guide/tour-still.webp" label="Clip: a guided tour stepping through a page" width={720} height={450} />
        <GuideFigure src="/media/guide/profile-tours-desk.webp" alt="The Tours panel on your profile, with Take it beside each page" width={1400} height={875} />
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">(i) tips</h3>
<p>A small (i) sits beside anything with a rule or a number behind it: karma, branch and length limits, <em>How branches are ranked</em>, <em>Approval</em>, <em>Invite slots</em>, <em>Your plan</em>, <em>Fair use</em>, <em>Live updates</em>, <em>Site rules</em> and every setting. Hover or focus it to see a card with a drawing and a sentence or two; on a phone, tap it, and tap anywhere else to close.</p>
        <GuideFigure src="/media/guide/tip-desk.webp" alt="An open tip: How branches are ranked" width={1400} height={815} />
      </Chapter>
      <Chapter n={8} id="invites" title="Invites and plans" line="Some doors open with an invite, and some rooms open with a plan.">
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Becoming an author</h3>
<p>Writing is invite-only, which keeps stories in the hands of people who care about them. Someone who already writes here creates an <strong className="font-semibold text-ink">invite link</strong> under <strong className="font-semibold text-ink">Dashboard → Invites</strong> and sends it to you. Each link:</p>
<ul>
<li>works <strong className="font-semibold text-ink">once</strong>, and <strong className="font-semibold text-ink">expires after 7 days</strong>;</li>
<li>shows who invited you when you open it; press <strong className="font-semibold text-ink">Accept</strong> (signing in first if needed) and you become an author;</li>
<li>holds one of the inviter&apos;s <strong className="font-semibold text-ink">invite slots</strong> while it waits, keeps it once used, and gives it back if it expires.</li>
</ul>
<p>The invites page lists every link you made as <em>Pending</em>, <em>Joined</em> or <em>Expired</em>, and admins can see the whole <strong className="font-semibold text-ink">invite chain</strong> (who invited whom). Anyone without an invite finds <em>How to become an author</em> linked from the About page and the write button.</p>
        <GuideFigure src="/media/guide/invites-desk.webp" alt="Dashboard → Invites: slots left, create a link, and every link's status" width={1400} height={875} />
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Plans</h3>
<p>Each person has a plan that switches features on. Admins can change what each plan includes, its price and its description, and give anyone a plan with an optional end date. Payments aren&apos;t taken yet; plans are assigned by admins.</p>
        <GuideTable head={["Feature", "Free (₹0)", "Author (₹199/month)", "Author Pro (₹499/month)"]} rows={[
          [<>Read every story</>, <>Yes</>, <>Yes</>, <>Yes</>],
          [<>Vote, follow, report lines</>, <>Yes</>, <>Yes</>, <>Yes</>],
          [<>Write lines and edit your own</>, <>No</>, <>Yes</>, <>Yes</>],
          [<>Start stories</>, <>No</>, <>Up to 3</>, <>Unlimited</>],
          [<>Invite authors</>, <>No</>, <>3</>, <>10</>],
          [<>Ask for more room</>, <>No</>, <>Yes</>, <>Yes</>],
          [<>Review requests on your stories</>, <>No</>, <>Yes</>, <>Yes</>],
          [<>Set limits for your own stories</>, <>No</>, <>No</>, <>Yes</>],
          [<>Approval queue for your stories</>, <>No</>, <>No</>, <>Yes</>],
        ]} />
        <p>The <strong className="font-semibold text-ink">Pricing</strong> page shows the same table for anyone, with the plan you&apos;re on marked. These are the starting defaults; the live page always reflects what admins set.</p>
        <GuideFigure src="/media/guide/pricing-desk.webp" alt="The Pricing page" width={1400} height={875} />
      </Chapter>
      <Chapter n={9} id="dashboard" title="The dashboard" line="Backstage, a desk with everything the people running the show need.">
        <p>The dashboard is where authors look after their stories and admins look after the site. Authors see their own stories; admins see everything. Anything that changes a story for others (approve, reject, pause, publish) asks first, in a dialog that says what will happen.</p>
        <GuideTable head={["Tab", "Who", "What you do there"]} rows={[
          [<>Overview</>, <>Authors, admins</>, <>Tiles for what needs you (lines waiting, requests waiting, reported lines) and how things are going (active stories, lines this week, readers, authors). A summary of the site rules, and the newest items waiting for review.</>],
          [<>Review</>, <>Story starters with approvals, admins</>, <>Approve or reject new lines and edits that are waiting, with an optional note to the writer. Filter by kind.</>],
          [<>Requests</>, <>Story starters, admins</>, <>Grant or decline requests for more branches or a longer path; choose how many extra slots to grant.</>],
          [<>Stories</>, <>Authors (their own), admins</>, <>Search and filter stories; see lines, longest path and branch use; pause a story (<em>make inactive</em>, with a reason) or reopen it; set its own limits and whether it holds lines for approval.</>],
          [<>Activity</>, <>Authors (their stories), admins</>, <>A log of everything that happened: lines approved or hidden, limits changed, roles changed, invites sent. Filter by kind.</>],
          [<>Invites</>, <>Authors, admins</>, <>Create invite links, copy them, and see who joined.</>],
          [<>Users</>, <>Admins</>, <>Find people by handle; change their role (reader, author, admin) and plan, with an optional end date. A table explains what each role can do.</>],
          [<>Plans</>, <>Admins</>, <>Edit each plan&apos;s name, price, description, features and quotas, and whether it shows on the Pricing page.</>],
          [<>Reports</>, <>Admins</>, <>Lines readers reported, with the reason; hide the line or keep it.</>],
          [<>Settings</>, <>Admins</>, <>Site rules: branches per line, lines per path, lines per author per hour, invite slots per author, whether new lines need approval. Live updates: on or off, and how often stories check.</>],
        ]} />
        <p>On phones, the tabs scroll sideways and every table becomes a stack of cards.</p>
        <GuideFigure src="/media/guide/dashboard-desk.webp" alt="Dashboard overview for an admin" width={1400} height={875} />
        <GuideFigure src="/media/guide/stories-desk.webp" alt="Dashboard → Stories: status, limits and branch use per story" width={1400} height={875} />
        <div className="guide-pair"><GuideFigure src="/media/guide/settings-desk.webp" alt="Dashboard → Settings: site rules and live updates" width={1400} height={875} /><GuideFigure src="/media/guide/dashboard-phone.webp" alt="The dashboard on a phone" width={520} height={1059} phone /></div>
      </Chapter>
      <Chapter n={10} id="speed" title="Live updates and speed" line="The story moves while you read it, and the pages keep up.">
        <h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Live updates</h3>
<p>While you have a story open, the page quietly checks for new lines and redraws itself when one appears on the path, branches or mini map you&apos;re looking at. You don&apos;t press anything.</p>
<ul>
<li>It only runs on the reading page, and pauses while the tab is hidden. Every other page stays still.</li>
<li>It checks for <strong className="font-semibold text-ink">lines</strong>, not votes, so a flurry of voting never makes the text jump under you. Vote counts refresh the next time you open a page.</li>
<li>Admins control it in <strong className="font-semibold text-ink">Dashboard → Settings</strong>: on or off, and how often to check, from every 1 second (the default) to every 300 seconds. An (i) tip there estimates the cost of each choice.</li>
<li>The checks are cached for a second at the edge, so a thousand readers on one story cost about the same as one.</li>
</ul>
<h3 className="pt-4 font-serif text-[18px] font-semibold text-ink">Why pages feel quick</h3>
<ul>
<li>Votes and follows update in place, without reloading the page.</li>
<li>Links in lists load ahead only when you hover, focus or touch them, instead of for everything on screen.</li>
<li>Fonts are served from Then What itself, so text shows sooner.</li>
<li>Trending order is worked out ahead of time (refreshed every 5 minutes and whenever a story changes), and permission checks are tuned to stay fast as stories grow.</li>
<li>Every button that sends something shows a small loader and can&apos;t be pressed twice.</li>
</ul>
      </Chapter>
      <Chapter n={11} id="errors" title="When things go wrong" line="Every story has a moment where the lights flicker. Here's what happens when they do.">
        <p>Every failure gets a plain message, never a blank screen or a frozen button.</p>
<ul>
<li><strong className="font-semibold text-ink">You&apos;re offline.</strong> If your connection drops while you vote, follow or save, the vote or star springs back and a small note says <em>Your vote didn&apos;t land. You&apos;re offline, so nothing changed</em> with a <strong className="font-semibold text-ink">Try again</strong> button.</li>
<li><strong className="font-semibold text-ink">Something fails on our side.</strong> You see a friendly message with a drawing and a way back, instead of an error page.</li>
<li><strong className="font-semibold text-ink">Your writing is safe.</strong> If a line, a profile edit or a new story doesn&apos;t save, what you typed stays in the form.</li>
<li><strong className="font-semibold text-ink">No double posts.</strong> Buttons show they&apos;re working and can&apos;t be pressed twice, so a slow connection never adds the same line twice.</li>
<li><strong className="font-semibold text-ink">Too many, too fast.</strong> Rate limits stop floods (for example, 10 new lines per author per hour by default). Hitting one says <em>You&apos;re doing that a lot. Wait a little and try again.</em></li>
<li><strong className="font-semibold text-ink">Page not found.</strong> Broken or old links land on a friendly not-found page with a way home.</li>
</ul>
        <GuideFigure src="/media/guide/offline-desk.webp" alt="A vote made while offline springs back, with a note and Try again" width={1400} height={875} />
      </Chapter>
      <Chapter n={12} id="safety" title="Safety, security and privacy" line="Behind every story, someone quietly checks the doors are locked.">
        <p>You don&apos;t need to know how it works, only that it&apos;s built to protect readers and writers.</p>
        <GuideTable head={["What", "How it protects you"]} rows={[
          [<>Your private details</>, <>Your email is never shown to anyone. Votes and follows are private; others only see totals.</>],
          [<>Who can do what</>, <>Every rule (roles, plans, limits, approvals, quotas) is checked by the database itself, not just by the page, so it can&apos;t be skipped.</>],
          [<>Sign-in</>, <>Google sign-in, an optional email link, and an optional Cloudflare bot check. Sign-in cookies can&apos;t be read by scripts on the page.</>],
          [<>Input</>, <>Everything you type is cleaned and checked for length and format before it&apos;s saved.</>],
          [<>Floods and spam</>, <>Rate limits on votes, follows, reports, invites, sign-ins and writing. Hidden fields catch simple bots on public forms.</>],
          [<>The page itself</>, <>A strict content security policy blocks scripts that didn&apos;t come from Then What.</>],
          [<>Moderation</>, <>Anyone signed in can report a line; starters and admins can hide lines and pause stories, and admins can take writing away by changing someone&apos;s role. Every such action is in the activity log.</>],
          [<>Photos</>, <>Uploads are re-encoded and resized, so nothing hidden in the original file survives.</>],
          [<>Analytics</>, <>Page views are counted without cookies; addresses are trimmed and sign-in pages skipped before anything is sent. No ads, no data selling.</>],
        ]} />
      </Chapter>
      <Chapter n={13} id="footer" title="Around the story: footer and story pages" line="Every page ends the same way: with a few more stories about us.">
        <p>Every page ends with a <strong className="font-semibold text-ink">footer</strong>: the Then What logo and tagline, links to this guide, About us, Changelog, Pricing, Privacy policy and Terms, the line <em>© 2026 Then What. Every story belongs to the people who wrote it.</em>, and <em>Vimalan and his team, Chennai · Made in India</em>, where <em>India</em> gently fades to <em>Tamil Nadu</em> and back (it stays still if you&apos;ve asked your device for less motion).</p>
        <GuideClip src="/media/guide/footer-clip.mp4" label="Clip: the footer, with India fading to Tamil Nadu" width={1100} height={330} />
        <p>The pages behind those links are written like the stories themselves: numbered chapters along a gold path, each opening with a one-line story beat, then the plain facts.</p>
        <GuideTable head={["Page", "Title on the page", "What it tells you"]} rows={[
          [<>About us</>, <><em>Once upon a line</em></>, <>The idea, branching, voting, invite-only writing, and who makes Then What. Ends with <em>Start reading</em> and <em>How to become an author</em>.</>],
          [<>Privacy policy</>, <><em>The story of your data</em></>, <>An <em>In short</em> summary, then what we know when you arrive, sign in, write, vote and follow; the companies that help (Supabase, Vercel, Google, Cloudflare); and what you can ask us to do.</>],
          [<>Terms</>, <><em>The house rules</em></>, <>Your account, who owns your words (you do), how to write well together, moderation, plans and invites, the fine print, and that Indian law and Chennai courts apply.</>],
          [<>Changelog</>, <><em>The story so far</em></>, <>Every release, newest first, as a dated story beat plus the changes people will notice.</>],
        ]} />
        <div className="guide-pair"><GuideFigure src="/media/guide/about-desk.webp" alt="About us: Once upon a line" width={1400} height={875} /><GuideFigure src="/media/guide/privacy-phone.webp" alt="The privacy policy on a phone, opening with In short" width={520} height={1059} phone /></div>
        <GuideFigure src="/media/guide/changelog-desk.webp" alt="The changelog: The story so far" width={1400} height={875} />
      </Chapter>
      <Chapter n={14} id="numbers" title="The numbers" line="For the readers who go straight to the footnotes.">
        <p>Every limit and default in one place. <em>Admin</em> means it can be changed in Dashboard → Settings; <em>per story</em> means a starter on Author Pro or an admin can set it for one story; <em>per line</em> means an admin or the starter can grant extra room on one line.</p>
        <GuideTable head={["Rule", "Default", "Allowed range", "Who can change it"]} rows={[
          [<>Characters per line</>, <>280</>, <>Fixed</>, <>Nobody</>],
          [<>Branches per line</>, <>No limit</>, <>1–50</>, <>Admin, per story, per line (up to 100)</>],
          [<>Lines per path (counting the opening line)</>, <>No limit</>, <>2–200</>, <>Admin, per story</>],
          [<>New lines per author per hour</>, <>10</>, <>1–500</>, <>Admin</>],
          [<>Invite slots per author (site default)</>, <>3</>, <>0–100</>, <>Admin; plans can set their own</>],
          [<>New lines need approval</>, <>No, they publish straight away</>, <>On or off</>, <>Admin, per story</>],
          [<>Live updates</>, <>On, checking every 1 second</>, <>1–300 seconds, or off</>, <>Admin</>],
          [<>Invite link lifetime</>, <>7 days, one use</>, <>Fixed</>, <>Nobody</>],
          [<>Handle length</>, <>3–24 characters</>, <>Fixed</>, <>Nobody</>],
          [<>Profile photo</>, <>Up to 4 MB, JPEG, PNG, WebP or GIF</>, <>Fixed</>, <>Nobody</>],
          [<>Branches shown before <em>Show more</em></>, <>5</>, <>Fixed</>, <>Nobody</>],
          [<>Trending order refresh</>, <>Every 5 minutes, and on every change</>, <>Fixed</>, <>Nobody</>],
          [<>Votes per person</>, <>120 a minute</>, <>Fixed</>, <>Nobody</>],
          [<>Reports per person</>, <>20 an hour</>, <>Fixed</>, <>Nobody</>],
        ]} />
      </Chapter>
      <Chapter n={15} id="glossary" title="Glossary" line="Every world has its own words. These are ours.">
        <GuideTable head={["Word", "Meaning"]} rows={[
          [<>Line</>, <>One piece of a story, up to 280 characters.</>],
          [<>Opening line</>, <>The first line of a story. Line 1 on every path.</>],
          [<>Branch</>, <>One of the lines that continue from the same line. A line with three continuations has three branches.</>],
          [<>Path</>, <>One route from the opening line down through the branches; a complete version of the story.</>],
          [<>Ending</>, <>A line the starter marked as complete. Its path is closed and the story shows in Finished.</>],
          [<>Starter</>, <>The person who opened a story. They look after it.</>],
          [<>Author</>, <>Someone who accepted an invite and can write (with an author plan).</>],
          [<>Reader</>, <>Anyone signed in who isn&apos;t an author. Can vote, follow and report.</>],
          [<>Admin</>, <>Someone who looks after the whole site. Has every feature.</>],
          [<>Handle</>, <>Your @name, shown on everything you write.</>],
          [<>Karma</>, <>Up votes minus down votes, across all your lines.</>],
          [<>Following</>, <>Stories you starred. They appear in your Following tab.</>],
          [<>Invite slot</>, <>One invite link you&apos;re allowed to have in use at a time.</>],
          [<>Approval</>, <>Holding a new line until the starter or an admin publishes it.</>],
          [<>Request</>, <>Asking a starter for more branches or a longer path than the limits allow.</>],
          [<>Spark</>, <>A random prompt for when you&apos;re stuck.</>],
          [<>Tree map</>, <>A zoomable drawing of every line and branch in a story.</>],
          [<>Tour</>, <>A short guided walk through a page, played once and replayable from the ? button.</>],
        ]} />
      </Chapter>
      <Chapter n={16} id="next" title="What's coming" line="The end? Not quite. Here's what we're writing next.">
        <p>Then What grows a release at a time, like the stories on it. Here&apos;s what isn&apos;t here yet, and what to do in the meantime.</p>
        <GuideTable head={["When", "What", "Until then"]} rows={[
          [<>Soon</>, <>Signing in with an email link</>, <>Sign in with Google.</>],
          [<>Soon</>, <>Downloading or deleting your account yourself</>, <>Ask us, and we&apos;ll do it for you.</>],
          [<>Soon</>, <>Paying for a plan with UPI or a card</>, <>Plans are given by admins; the prices on Pricing aren&apos;t charged.</>],
          [<>Soon</>, <>Notifications when your line is approved or continued, or your request is answered</>, <>Check your dashboard and profile.</>],
          [<>Later</>, <>Search and genre filters</>, <>Browse by tab: Trending, New, Top, Finished, Following.</>],
          [<>Later</>, <>Co-authors, and private stories for invited readers</>, <>Every published story is public, with one starter.</>],
          [<>Later</>, <>Installing Then What as an app</>, <>Use it in your phone&apos;s browser; it&apos;s built for phones.</>],
        ]} />
        <p>Every release is told in the <Link href="/changelog">changelog</Link>.</p>
      </Chapter>
    </Chapters>
  );
}
