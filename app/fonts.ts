import localFont from "next/font/local";

/**
 * Fonts served from our own domain (next/font), from the Fontsource npm packages:
 * no request to Google, nothing blocking the first paint, no layout jump while they load,
 * and builds never depend on Google Fonts being reachable. Latin subset; other scripts fall
 * back to Georgia / the system font, as before. Source Serif uses the weight-only file (51 KB),
 * not the optical-size one (122 KB): headings look almost the same for less than half the download.
 * No italic file (51 KB, preloaded on every page): italic serif appears only in the loading
 * placeholder, where the browser's slanted regular is fine.
 */
export const serif = localFont({
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "serif"],
  src: [
    { path: "../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2", weight: "200 900", style: "normal" },
  ],
});

export const sans = localFont({
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  src: [{ path: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
});
