import { expect, test } from "@playwright/test";

test("home lists stories with tabs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Trending" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Finished" })).toBeVisible();
});

test("a story opens on its first line and the tree map loads", async ({ page }) => {
  await page.goto("/");
  const first = page.locator("ul li a[href^='/s/']").first();
  test.skip((await first.count()) === 0, "No stories yet: run supabase/seed-demo.sql");
  await first.click();
  await expect(page.getByRole("heading", { name: /then what\?/i })).toBeVisible();
  await page.getByRole("link", { name: "View full tree map" }).click();
  await expect(page.getByText("full tree")).toBeVisible();
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
});

test("author pages send signed-out visitors to sign in", async ({ page }) => {
  for (const path of ["/new", "/invites", "/admin", "/dashboard", "/dashboard/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});

test("no horizontal scroll on the home page", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
