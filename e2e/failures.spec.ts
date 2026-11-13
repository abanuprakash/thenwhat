import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Failure states: no connection, a dropped connection, a server error, a file that's too big,
 * double submits. None of these may replace the page or lose what someone typed.
 *
 * The signed-out checks run against any site. The signed-in ones need the demo data server:
 *   npm run mock
 *   SUPABASE_URL=http://localhost:54321 SUPABASE_ANON_KEY=mock npm run build && npm start   (or npm run dev)
 *   MOCK=1 npm run test:failures -- --project=desktop
 */

const MOCK = !!process.env.MOCK;
const STORY = "/s/the-last-signal-abc123/00000000-0000-4000-8000-000000000001";

async function signIn(context: BrowserContext) {
  const session = {
    access_token: "mock-access",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "r",
    user: { id: "00000000-0000-4000-8000-000000000900" },
  };
  const url = new URL(test.info().project.use.baseURL ?? "http://localhost:3000");
  await context.addCookies([
    { name: "sb-localhost-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), domain: url.hostname, path: "/" },
  ]);
}

const pageStillThere = async (page: Page) => {
  await expect(page.getByText("This page lost its thread")).toHaveCount(0);
  await expect(page.getByText("This page is out of reach")).toHaveCount(0);
};

test.describe("signed out", () => {
  test("going offline shows a note, and coming back says so", async ({ page, context }) => {
    await page.goto("/");
    await context.setOffline(true);
    await expect(page.getByText("The thread snapped")).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText("Back on the thread")).toBeVisible();
    await expect(page.getByText("Back on the thread")).toBeHidden({ timeout: 6000 });
  });

  test("a link tapped while offline keeps you on the page", async ({ page, context }) => {
    await page.goto("/");
    await context.setOffline(true);
    await page.locator('a[href^="/s/"]').first().click();
    await expect(page.getByText("That page is out of reach")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("Google sign-in while offline stays put and explains", async ({ page, context }) => {
    await page.goto("/login");
    await context.setOffline(true);
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page.getByText("That can't go anywhere yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });
});

test.describe("signed in (demo data)", () => {
  test.skip(!MOCK, "needs the demo data server: MOCK=1, see the top of this file");
  test.beforeEach(async ({ context }) => signIn(context));

  test("a vote while offline flips back with a note and a retry", async ({ page, context }) => {
    await page.goto(STORY);
    const up = page.getByRole("button", { name: "Upvote" }).first();
    await context.setOffline(true);
    await up.click();
    await expect(page.getByText("Your vote didn't land")).toBeVisible();
    await expect(up).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await pageStillThere(page);
  });

  test("a follow while offline flips back with a note", async ({ page, context }) => {
    await page.goto(STORY);
    await context.setOffline(true);
    await page.getByRole("button", { name: "Follow story" }).first().click();
    await expect(page.getByText("That star didn't stick")).toBeVisible();
    await expect(page.getByRole("button", { name: "Follow story" }).first()).toHaveAttribute("aria-pressed", "false");
    await pageStillThere(page);
  });

  test("saving the profile offline keeps what you typed", async ({ page, context }) => {
    await page.goto("/u/noemi_vance");
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.locator('textarea[name="bio"]').fill("Something I typed carefully.");
    await context.setOffline(true);
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("That didn't reach us")).toBeVisible();
    await expect(page.locator('textarea[name="bio"]')).toHaveValue("Something I typed carefully.");
    await pageStillThere(page);
  });

  test("a server error says it's on our side", async ({ page }) => {
    await page.goto("/u/noemi_vance");
    await page.getByRole("button", { name: "Edit profile" }).click();
    // Make the next Server Action call fail with a 500.
    await page.route("**/u/noemi_vance", (route) => (route.request().method() === "POST" ? route.fulfill({ status: 500, body: "boom" }) : route.continue()));
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Our side tripped")).toBeVisible();
    await pageStillThere(page);
  });

  test("approving offline keeps the confirmation open with the reason", async ({ page, context }) => {
    test.skip(test.info().project.name === "mobile", "same component; checked on desktop");
    await page.goto("/dashboard/review");
    await page.getByRole("button", { name: "Approve" }).first().click();
    await context.setOffline(true);
    await page.getByRole("button", { name: "Publish line" }).click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog.getByText("That didn't go through")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Try again" })).toBeVisible();
    await pageStillThere(page);
  });

  test("a photo over 4 MB is stopped before it uploads", async ({ page }) => {
    await page.goto("/u/noemi_vance");
    await page.getByRole("button", { name: "Edit profile" }).click();
    let posted = false;
    page.on("request", (r) => {
      if (r.method() === "POST") posted = true;
    });
    await page.locator('input[type="file"]').setInputFiles({ name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(5 * 1024 * 1024, 1) });
    await expect(page.getByText(/That photo is 5\.0 MB, and the limit is 4 MB/)).toBeVisible();
    expect(posted).toBe(false);
  });

  test("a file that isn't a photo is refused", async ({ page }) => {
    await page.goto("/u/noemi_vance");
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "notes.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
    await expect(page.getByText("That file isn't a photo we can use")).toBeVisible();
  });

  test("a fast triple tap on save sends once and the button comes back", async ({ page }) => {
    await page.goto("/u/noemi_vance");
    await page.getByRole("button", { name: "Edit profile" }).click();
    let posts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST") posts++;
    });
    // Three clicks in the same instant, faster than React can re-render the button as disabled.
    await page.evaluate(() => {
      const save = [...document.querySelectorAll<HTMLButtonElement>("button[type=submit]")].find((b) => b.textContent?.includes("Save profile"))!;
      save.click();
      save.click();
      save.click();
    });
    await expect(page.getByText("Saved.")).toBeVisible();
    expect(posts).toBe(1);
    await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled();
  });
});
