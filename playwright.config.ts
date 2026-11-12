import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against a running site: `npm run dev` locally, or set BASE_URL
// to a Vercel preview link.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
