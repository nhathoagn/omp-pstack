---
name: omp-mechanics
description: "pstack-specific omp amendments that sit outside the live task contract. Read after `skill://poteto-mode`; use `skill://pstack-omp` for task, model, and runtime mechanics."
disable-model-invocation: true
---

# omp mechanics

`skill://pstack-omp` is the sole live task, model, and runtime contract. Read it before dispatch. This skill keeps only the omp amendments that belong to specific pstack workflows. It does not restate wire fields, batch shapes, or result resources.

## Workflow amendments

### how

Spawn `explorer` once per exploration angle for complex questions. It is read-only and already carries the exploration prompt. For a simple question, spawn `synthesizer` with `skill://how/references/explainer-prompt.md` named in the brief. For the complex path, spawn `synthesizer` with the same template plus every explorer's findings. In critique mode, spawn `critic` once per panel lane.

### why

Spawn one `investigator` per evidence category. `investigator` keeps MCP access, so it can read tickets, docs, chat, observability, error tracking, and analytics through the tools and `mcp://<uri>` resources this session exposes. Do not look for a Cursor `mcps/` directory. A category with no matching MCP is a recorded gap, not a silent skip. Spawn `synthesizer` with `skill://why/references/synthesizer-prompt.md` and `skill://why/references/epistemics.md` named in the brief.

### interrogate

Spawn `code-reviewer` once per lane in the four-model panel (`@pstack-review-a` through `@pstack-review-d`), tagging each brief with its lane. The parent normally performs lead judgment itself, because it holds the conversation context the reviewers lack. Delegate to `lead-judgment` only when the parent's context is too large to weigh findings reliably; pass the goal, constraints, rejected alternatives, and the full findings. Never auto-apply a finding.

### reflect

The transcript is the current session journal under `~/.omp/agent/sessions/`. Pass its absolute path to each reviewer; if a reviewer cannot read it, inline a digest instead of guessing. Spawn three reviewers with the judgment, tooling, and divergent templates, each brief tagged `lane: @pstack-judgment`, `lane: @pstack-code-hard`, and `lane: @pstack-judgment` in that order. Then spawn `synthesizer` with `skill://reflect/references/synthesizer.md` and each reviewer's output inlined. The parent applies accepted edits only after user approval.

### architect and arena

Spawn `designer` once per arm, each with an isolated working directory and output path. `designer` writes the candidate package; it never touches the parent worktree. Tag the arms with the four panel lanes for model diversity, or let the batch take them in panel order. In arena, freeze candidates before judges start; a judge spawned while candidates are still writing reports dropouts as empty.

### swarm

There is no cloud environment. Spawn local workers with disjoint worktrees when `task.isolation.enabled` is on, or arrange explicit worktrees yourself. Tag each worker brief `lane: @pstack-code` unless a race assigns another lane; the panel lanes are for the race arms. A worker that only reads uses `explorer` instead.

### bug-fix and debugging

Use `lsp` for `definition` and `references` to narrow a suspect value. When program state is unclear, use `debug` before adding logging. If neither is enabled in this session, fall back to the project's own reproduction and test commands.

### verification skills

`create-verification-skill` and `maintain-verification-skill` write project-local skills. The destination is `.omp/skills/<name>/SKILL.md` (user-level: `~/.omp/agent/skills/<name>/SKILL.md`). There is no built-in `/create-skill` command; write the file directly, or use `manage_skill` only when the user wants an omp-managed skill. The `name` field must equal the directory name.

### multi-phase plans

Resolve the installed plugin root before running a bundled script. `skill://poteto-mode/scripts/check-plan.mjs` is readable through the skill URL, but execution needs the real path: the marketplace install symlinks the plugin at `~/.omp/plugins/node_modules/pstack`, so `scripts/` resolves under that directory. Verify the path exists before invoking it; do not assume a global package location.

### make-bot-ui

Read `skill://make-bot-ui` as written. Its Grok Bot webhook targets `api2.cursor.sh`, which has no omp equivalent. Do not stand up a replacement webhook; keep the UI work and skip the deployment step.

### TypeScript

omp does not auto-attach a skill from `globs`. Read `skill://typescript-best-practices` before editing a `.ts` or `.tsx` file.

### setup-pstack

`setup-pstack` writes `modelRoles` in `~/.omp/agent/config.yml`. Preserve every unrelated key in that file. Validate each selector against `omp models --json` before writing it. A default that is unavailable is a choice for the user, not a reason to substitute a weaker model.

## Session store

Before `recall`, `reflect`, `show-me-your-work`, `automate-me`, or `session-pickup` reads a transcript, read `skill://pstack-omp` for the store path and encoding. Do not guess a `.cursor/projects` path.

## Upstream text that does not apply

- `poteto-mode` and `babysit` warn against Cursor's built-in `babysit` skill. omp has no such skill; the warning is inert.
- `bugbot-triage` still applies to review comments from omp's security reviewer and from any hosted review bot.
- `worktree-cleanup` assumes a macOS `trash` command. Use `trash` where it exists and `mv` to a recoverable directory where it does not; never `rm -rf` an unmerged worktree.
- `orchestrate` names Graphite (`gt`). Prefer `gh` and the active forge client; do not require `gt`.
- `shipping`, `autopilot-*`, `opening-a-pr`, `multi-phase-plan`, `orchestrate`, and `visual-parity` mention `control-ui`, `control-cli`, or `deslop` from Cursor's team kit. They already phrase these as "when your install ships one"; on omp drive the surface directly (or use a project control skill if the repo has one) and skip the slop-strip step.
