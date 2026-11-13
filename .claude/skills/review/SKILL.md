---
name: review
description: Review the current changes in Then What for security, design and code quality before committing.
disable-model-invocation: true
---

Review the current changes: `git status` and `git diff` (staged and unstaged), plus new files.

1. Ask the `security-reviewer` agent to review the diff against `.claude/skills/security-review/SKILL.md`.
2. Ask the `design-reviewer` agent to review any UI or copy changes against `docs/DESIGN.md`.
3. Check the code yourself:
   - follows `CLAUDE.md` (server-only data access, append-only migrations, action order),
   - no dead code or leftover logging,
   - types in step with SQL,
   - tests added for new rules.

Merge the findings into one list, most serious first. Each item gets file:line, the problem, and a fix. Don't edit files; this is a review.
