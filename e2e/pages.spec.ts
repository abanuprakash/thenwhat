import { expect, test } from "@playwright/test";

const PAGES = [
  { link: "Feature guide", path: "/guide", heading: "Every feature, explained" },
  { link: "About us", path: "/about", heading: "Once upon a line" },
  { link: "Changelog", path: "/changelog", heading: "The story so far" },
  { link: "Privacy policy", path: "/privacy", heading: "The story of your data" },
  { link: "Terms", path: "/terms", heading: "The house rules" },
];

test("the footer leads to every story page, and each one reads well", async ({ page }) => {
  for (const p of PAGES) {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("©");
    await footer.getByRole("link", { name: p.link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${p.path}$`));
    await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible();
    // Chapters sit on the story path, numbered like lines.
    await expect(page.getByText("Line 1", { exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  }
});

test("the footer says where it's made, for screen readers too", async ({ page }) => {
  await page.goto("/about");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Made in");
  await expect(footer.locator(".sr-only")).toHaveText("India, Tamil Nadu");
});

test("with reduced motion, the places sit still side by side", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/about");
  await expect(page.locator(".made-in-still")).toBeVisible();
  await expect(page.locator(".made-in")).toBeHidden();
  await context.close();
});

test("sign-in links to the house rules and privacy policy", async ({ page }) => {
  await page.goto("/login");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "house rules", exact: true })).toHaveAttribute("href", "/terms");
  await expect(main.getByRole("link", { name: "privacy policy", exact: true })).toHaveAttribute("href", "/privacy");
});

test("the guide's contents lead to each chapter, and its pictures and clips load", async ({ page }) => {
  await page.goto("/guide");
  const contents = page.getByRole("navigation", { name: "In this guide" });
  await contents.getByRole("link", { name: "The dashboard" }).click();
  await expect(page).toHaveURL(/#dashboard$/);
  await expect(page.getByRole("heading", { level: 2, name: "The dashboard" })).toBeInViewport();
  // Every screenshot loaded (none broken).
  const broken = await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll("main img")] as HTMLImageElement[];
    imgs.forEach((i) => (i.loading = "eager"));
    await Promise.all(
      imgs.map((i) =>
        i.complete
          ? null
          : new Promise((r) => {
              i.addEventListener("load", r, { once: true });
              i.addEventListener("error", r, { once: true });
            }),
      ),
    );
    return imgs.filter((i) => i.naturalWidth === 0).map((i) => i.alt);
  });
  expect(broken).toEqual([]);
  // A clip offers a play/pause button with its description.
  await expect(page.getByRole("button", { name: /clip: Clip: scrolling to the branches/ })).toHaveCount(1);
});
