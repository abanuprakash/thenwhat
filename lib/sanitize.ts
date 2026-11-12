/**
 * Cleans user text before it's validated and stored:
 * - Unicode NFC normalisation (one spelling for each character)
 * - removes control characters, zero-width characters and bidi overrides
 *   (used to hide text, spoof names or reverse what you see)
 * - normalises line breaks and collapses runs of blank lines
 * The database rejects these characters too (text_is_clean), so this is the friendly first pass.
 * Output is always rendered as text by React, never as HTML.
 */
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

export function cleanText(input: unknown, { multiline = true }: { multiline?: boolean } = {}): string {
  if (typeof input !== "string") return "";
  let s = input.normalize("NFC").replace(/\r\n?/g, "\n").replace(INVISIBLE, "");
  s = multiline ? s.replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  return s.trim();
}

export function cleanHandle(input: unknown): string {
  return typeof input === "string" ? input.normalize("NFKC").trim().replace(/^@/, "").toLowerCase() : "";
}

/** Only same-site paths: no protocol-relative (//x), backslash (/\x) or encoded tricks. */
export function safeNextPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || next.length > 300) return fallback;
  let decoded = next;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (!next.startsWith("/") || next.startsWith("//") || /[\\\s]/.test(decoded) || decoded.startsWith("//")) return fallback;
  return next;
}
