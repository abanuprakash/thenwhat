#!/usr/bin/env node
// Screenshots pages at phone and desktop widths and flags common layout and accessibility problems.
// Usage: node scripts/ui-check.mjs [/path ...]   (BASE_URL defaults to http://localhost:3000)
// Signed-in pages: UI_CHECK_COOKIE="name=value" (copy your sb-…-auth-token cookie from the browser).
import { mkdirSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/login", "/pricing"];
const out = ".ui-check";
mkdirSync(out, { recursive: true });

const sizes = [
  ["phone", devices["iPhone 13"]],
  ["desktop", { viewport: { width: 1280, height: 860 } }],
];

const browser = await chromium.launch();
let problems = 0;
for (const [label, options] of sizes) {
  const context = await browser.newContext(options);
  if (process.env.UI_CHECK_COOKIE) {
    const [name, ...rest] = process.env.UI_CHECK_COOKIE.split("=");
    await context.addCookies([{ name, value: rest.join("="), url: base }]);
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Ignore font/network hiccups that aren't the app's fault.
  page.on("console", (m) => m.type() === "error" && !/fonts\.g|ERR_TUNNEL|ERR_PROXY|ERR_INTERNET_DISCONNECTED/.test(m.text()) && errors.push(m.text().slice(0, 160)));

  for (const path of paths) {
    errors.length = 0;
    const res = await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(700); // let entrance animations settle
    const report = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      return {
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        duplicateIds: [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))],
        unlabelled: [...document.querySelectorAll("input:not([type=hidden]), select, textarea")]
          .filter((el) => el.offsetParent !== null && !(el.labels && el.labels.length) && !el.getAttribute("aria-label") && el.name !== "website")
          .map((el) => el.name || el.id || el.tagName.toLowerCase()),
        h1: document.querySelectorAll("h1").length,
        smallTargets: [...document.querySelectorAll("button, a")]
          // Visually hidden elements (sr-only skip links) are 1px on purpose; skip them.
          .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.width < 24 && r.height < 24; })
          .length,
      };
    });
    const file = `${out}/${label}${path.replace(/[^\w]+/g, "-").replace(/-$/, "") || "-home"}.png`;
    await page.screenshot({ path: file, fullPage: true });
    const issues = [];
    if (report.overflow) issues.push("sideways scroll");
    if (report.duplicateIds.length) issues.push(`duplicate ids: ${report.duplicateIds.join(", ")}`);
    if (report.unlabelled.length) issues.push(`unlabelled fields: ${report.unlabelled.join(", ")}`);
    if (report.h1 !== 1) issues.push(`${report.h1} h1 elements (want 1)`);
    if (report.smallTargets) issues.push(`${report.smallTargets} tap targets under 24px`);
    if (errors.length) issues.push(`console errors: ${[...new Set(errors)].join(" | ")}`);
    problems += issues.length;
    console.log(`${issues.length ? "✗" : "✓"} ${label.padEnd(7)} ${String(res?.status()).padEnd(4)} ${path}  → ${file}`);
    issues.forEach((i) => console.log(`    - ${i}`));
  }
  await context.close();
}
await browser.close();
console.log(problems ? `\n${problems} issue(s) found.` : "\nNo issues found.");
