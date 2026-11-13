#!/usr/bin/env node
// Claude Code PreToolUse hook: blocks edits to migrations that are already committed.
// Migrations may already have run on a real database, so changes go in a new file instead.
// New, uncommitted migration files can still be edited freely.
import { execFileSync } from "node:child_process";
import { relative } from "node:path";

let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  let filePath = "";
  try {
    filePath = JSON.parse(input)?.tool_input?.file_path ?? "";
  } catch {
    process.exit(0);
  }
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const rel = relative(root, filePath).replaceAll("\\", "/");
  if (!rel.startsWith("supabase/migrations/") || !rel.endsWith(".sql")) process.exit(0);
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", rel], { cwd: root, stdio: "ignore" });
  } catch {
    process.exit(0); // not committed yet: fine to edit
  }
  console.error(
    `${rel} is already committed and may have run on a database. Don't edit it: create a new migration ` +
      "(see the db-migration skill) with a later timestamp instead.",
  );
  process.exit(2);
});
