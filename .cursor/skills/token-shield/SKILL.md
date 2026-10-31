---
name: token-shield
description: "Token-saving discipline for AI coding. Use ALWAYS at the start of every coding task, in every project. This skill OVERRIDES any habit that wastes context: it forces the agent to read as little as possible, never re-read, never dump full files or logs, and delegate exploration to cheap subagents. Goal: maximum quality for minimum tokens."
metadata:
  surfaces:
    - ide
    - cloud
---

# Token Shield Skill

Tokens are money. The agent's answers cost almost nothing — what costs is what the agent READS. Every file read, every log dumped, every skill loaded is re-sent on every turn. This skill exists to cut that waste without cutting quality.

## HARD RULES (never break)

1. **Read only what the task needs, nothing else.** Before reading a file, ask: is this file required for this exact change? If not, do not open it.
2. **Never read whole files when a part is enough.** Prefer targeted search (`rg`, symbol search, Serena `find_symbol`) and read only the relevant range (function, component, lines around the change). A 500-line file read for a 5-line change is a failure.
3. **Never re-read a file already read in this session** unless it was edited since. Reuse what is already in context.
4. **NEVER read these, ever:** `node_modules/`, `dist/`, `build/`, `.next/`, `out/`, `coverage/`, lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`), minified files (`*.min.js`, `*.min.css`), source maps (`*.map`), generated code, binaries, images, `.git/`, `.vercel/`, `.turbo/`. (The project's `.cursorignore` enforces the same list — respect it.)
5. **Never dump full logs or outputs.** For builds and tests: show errors and the failing lines only, never the full log. Filter with `tail`, `grep -i error`, or the test runner's reporter. Never poll in a loop: run once, read once.
6. **Never load a skill you do not need for this task.** Skills load on demand: load exactly the skill the task requires (e.g. `sauveria-design` for a Sauveria screen, `frontend-design` for a new screen), never the whole library. Never install or enable ECC in full — minimal profile only (planner, TDD, reviewer, security).
7. **Small targeted edits, never rewrites.** To change 5 lines, edit 5 lines. Never regenerate an entire file, component, or page when a patch is enough.
8. **Summarize, don't paste.** When reporting progress, summarize what changed (files + lines + result). Never paste full file contents, full diffs, or full logs into the conversation.
9. **One task per session.** Do not chain five unrelated fixes in one session: each new task starts fresh, so the context stays small. If a session grows long, summarize the state into a short note and start a new session instead of dragging the whole history.
10. **Delegate exploration to cheap subagents.** Searching, mapping, or auditing the codebase goes to a subagent with the smallest capable model — its report (short summary) comes back, not the raw files it read. The main agent keeps its context for decisions and edits only.
11. **Use Serena MCP when available.** Prefer Serena's symbol tools (`find_symbol`, `find_referencing_symbols`, `get_symbols_overview`, `replace_symbol_body`) over text search and full-file reads. If Serena is not installed, say so once and fall back to `rg` + ranged reads.
12. **Batch independent tool calls** in one block instead of one-by-one round trips. Fewer turns = fewer re-sends of the whole context.

## WORKFLOW FOR EVERY TASK

1. Read this skill (it is short on purpose) and the project's own skill for the task — nothing else up front.
2. Locate the exact files/symbols with search. Read only the needed ranges.
3. Plan briefly (a few lines), then implement with minimal edits.
4. Verify with a real check (real browser render for UI, real endpoint/test for logic) — filtered output only.
5. Report in 5 lines max: what changed, where, verification result, what remains (if anything).

## WHAT "DONE" LOOKS LIKE

A task is done when the change is minimal, verified for real, and reported briefly. A long conversation, a huge diff, or a re-read file means tokens were wasted — avoid all three.
