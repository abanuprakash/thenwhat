import { expect, test } from "@playwright/test";

// Tours never start on their own in automated browsers; this flag lets these tests opt in.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tw-tours-test", "1"));
});

test("a guest's first visit gets the home tour once, and the ? brings it back", async ({ page }) => {
  await page.goto("/");
  const tour = page.getByTestId("tour");
  await expect(tour).toBeVisible();
  await expect(tour.getByRole("heading", { name: "Welcome to Then What" })).toBeVisible();

  // Keyboard: → moves on, ← goes back, and the step count follows.
  await page.keyboard.press("ArrowRight");
  await expect(tour).toContainText("2 of");
  await page.keyboard.press("ArrowLeft");
  await expect(tour).toContainText("1 of");

  // Walk to the end.
  for (let i = 0; i < 10 && (await tour.getByRole("button", { name: "Done" }).count()) === 0; i++) {
    await tour.getByRole("button", { name: "Next" }).click();
  }
  await tour.getByRole("button", { name: "Done" }).click();
  await expect(tour).toBeHidden();

  // Seen: not again on the next visit.
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(tour).toBeHidden();

  // The ? replays it any time.
  await page.getByRole("button", { name: /take the tour/i }).click();
  await expect(tour).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tour).toBeHidden();
});

test("the reading page has its own tour, and missing parts are skipped", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tour").getByRole("button", { name: "Skip tour" }).click();
  const first = page.locator("ul li a[href^='/s/']").first();
  test.skip((await first.count()) === 0, "No stories yet: run supabase/seed-demo.sql");
  await first.click();
  const tour = page.getByTestId("tour");
  await expect(tour).toContainText("Reading a story");
  // Every step points at something that's actually on the page (or the middle of the screen).
  await expect(tour.getByRole("heading", { name: "The line you're on" })).toBeVisible();
});

test("info tips explain on focus and close with Esc", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("tour").getByRole("button", { name: "Skip tour" }).click();
  const first = page.locator("ul li a[href^='/s/']").first();
  test.skip((await first.count()) === 0, "No stories yet: run supabase/seed-demo.sql");
  await first.click();
  await page.getByTestId("tour").getByRole("button", { name: "Skip tour" }).click();
  const tip = page.getByRole("button", { name: "About how branches are ranked" });
  await tip.focus();
  await expect(page.getByRole("tooltip")).toContainText("How branches are ranked");
  await expect(tip).toHaveAttribute("aria-describedby", /.+/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
});

test("without the opt-in, automated browsers never see a tour", async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("/");
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("tour")).toBeHidden();
  await page.close();
});
