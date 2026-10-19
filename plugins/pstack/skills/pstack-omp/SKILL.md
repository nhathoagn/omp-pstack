---
name: pstack-omp
description: "Live omp mechanics for pstack: task subagents, model lanes, ask, todo, isolation, skill and rule paths, session store, and the pstack status line. Read before following any task-shaped instruction in a pstack skill."
---

# pstack on omp

`skill://poteto-mode` chooses the playbook, role, step order, and gates. This skill is the live harness contract for omp 18.x. Where imported pstack prose says `Task`, `subagent_type`, `readonly`, `environment`, or `run_in_background`, this file wins. It never weakens a playbook's verification or safety gate.

## Skills, rules, commands

- Invoke a skill with `/skill:<name>` or read it at `skill://<name>`. Files inside a skill are readable at `skill://<name>/<relative-path>`.
- Plugin skills use their bare names: `poteto-mode`, `how`, `why`, `interrogate`. There is no `pstack:` skill prefix.
- Marketplace plugin commands are namespaced `pstack:<command>`.
- `rules/pstack-session-mandate.md` ships in this plugin with `alwaysApply: true`. omp injects it; there is no paste-into-AGENTS.md step.
- Project skills live in `.omp/skills/`; user skills in `~/.omp/agent/skills/`; project agents in `.omp/agents/`; user agents in `~/.omp/agent/agents/`. Never write `.cursor/`.

## The task tool

One participant:

```text
task({
  agent: "explorer",
  task: "<self-contained brief>",
  solutionSpace: "<one line: is the fix given, or which causes or designs are open>",
})
```

Many participants: pass `context` plus `tasks[]` when the live schema exposes a batch shape; otherwise issue one call per participant before waiting. Never invent a field the live schema does not expose.

Rules that change pstack prose:

- **Children start blank.** They never see this conversation. Every brief carries the target, the change, and the acceptance criteria, plus absolute paths or `skill://` URIs for shared material. Put large shared payloads at `local://<name>.md` and name that path in the brief.
- **`solutionSpace` is required.** One line describing how open the child's problem is. Volume of work does not widen it. Never mention sibling agents or coordination.
- **`blocking: true` agents return inline.** `explorer`, `critic`, `code-reviewer`, `lead-judgment`, `designer`, `investigator`, `synthesizer`, and `comment-sicko` declare it, so a fan-out still runs in parallel and the parent waits for every result. `poteto-agent` is asynchronous: it returns a job id and auto-delivers.
- **Results.** Read a complete result at `agent://<id>`; inspect a child transcript at `history://<id>`; use `wait` to block on a job this session started. Do not infer liveness from timestamps.
- **`readonly` does not exist.** Read-only is an agent tool allowlist. `explorer`, `critic`, `code-reviewer`, and `lead-judgment` are read-only agents. `investigator` and `synthesizer` keep MCP access and are instructed not to write; state the write ban in the brief anyway. A read-only brief is not a sandbox.
- **`task` takes no `model`.** omp rejects it: `` `model` is only accepted for the `seance` agent``. Lanes ride on the agent and on the plugin extension instead, in this order: the agent's frontmatter lane, a `lane: @pstack-<lane>` tag in the brief, then the panel order for a multi-arm batch. Write the tag when a specific lane matters; otherwise the frontmatter lane and the panel order cover it. Never treat the parent's model as a lane. A lane with no configured value fails the spawn with `No model selected` rather than downgrading, so report it and ask instead of removing the requirement. `seance` is the one place a call names its own model, and it is a read-only consult on a saved session, not a spawn.
- **`environment: "cloud"` does not exist.** `isolated: true` gives the child a worktree when `task.isolation.enabled` is on. Otherwise arrange disjoint worktrees yourself, or serialize a genuinely shared write. Never switch branches in a shared checkout and call that isolation.
- **`run_in_background` does not exist.** Cursor's per-call flag has no omp counterpart: async is the default for any agent without `blocking: true`, and the agent's own frontmatter decides whether the parent waits. Do not promise a background mode the agent does not declare.
- **`outputSchema` and `schemaMode`** are how a judgment arrives when the live schema exposes them. Use `strict` only when a malformed verdict should fail the run.
- **`tools`** is an eval-only field. Do not use it to emulate `readonly`.

## The nine agents

| Agent | Role | Read-only |
|---|---|---|
| `poteto-agent` | Full poteto style. `poteto-mode` is autoloaded before work. Async. | no |
| `comment-sicko` | Comment deletion and workaround condemnation. Report only. | no |
| `explorer` | One exploration angle for a "how" question. | yes |
| `critic` | Architectural critique of an existing explanation. | yes |
| `code-reviewer` | Adversarial diff review with the pstack rubric and quality lens. | yes |
| `lead-judgment` | Filter reviewer findings into Act On / Consider / Noted / Dismissed. | yes |
| `designer` | One architect candidate design package in an isolated directory. | writes design files only |
| `investigator` | One historical source for a "why" question. Keeps MCP. | posture only |
| `synthesizer` | Merge parallel findings using the named template. Keeps MCP. | posture only |

`poteto-agent` and `comment-sicko` are ported 1:1 from upstream. The other seven promote upstream's inline prompt templates to first-class agents; each reads its authoritative template from `skill://` before working.

## Model lanes

`setup-pstack` writes these keys under `modelRoles` in `~/.omp/agent/config.yml`. `@<lane>` names one. Re-run `/skill:setup-pstack` to change the values.

A lane reaches a spawn through one of three paths:

1. **The agent's frontmatter lane.** Every pstack agent ships `model: "@pstack-<lane>"`, so its spawns land on that lane with no instruction from the parent.
2. **A `lane: @pstack-<lane>` tag in the brief.** This wins over the frontmatter, and it is how one agent plays several roles: a `poteto-agent` brief tagged `lane: @pstack-code-hard` runs on the hard-code lane.
3. **The panel order.** When one batch spawns two or more arms of `critic`, `code-reviewer`, or `designer`, each arm takes the next panel lane by position, so a race runs one model per arm. A tag still wins over position.

| Agent | Frontmatter lane |
|---|---|
| `poteto-agent` | `pstack-code` |
| `explorer`, `investigator` | `pstack-explore` |
| `designer` | `pstack-design` |
| `synthesizer`, `lead-judgment`, `comment-sicko` | `pstack-judgment` |
| `critic`, `code-reviewer` | `pstack-review-a` |

| Lane | Used for | Intent default |
|---|---|---|
| `pstack-code` | feature and refactoring implementation, swarm workers | Grok 4.6 |
| `pstack-code-hard` | bug-fix, perf-issue, hillclimb, tooling lens | GPT-5.6 Sol |
| `pstack-judgment` | judgment and prose, hardest tasks, explainers, why/reflect synthesizers | Fable 5 |
| `pstack-design` | single-arm design passes and designer sweeps; arena arms use the panel lanes | Opus 5 |
| `pstack-explore` | explorers, investigators, research | Grok 4.6 |
| `pstack-review-a` | multi-model panel: interrogate reviewers, how critics, arena runners/judges, architect runners | Fable 5 |
| `pstack-review-b` | same panel | GPT-5.6 Sol |
| `pstack-review-c` | same panel | Grok 4.6 |
| `pstack-review-d` | same panel | Opus 5 |
| `pstack-security` | security-focused review split from ordinary review | GPT-5.6 Sol |

A lane with no configured value is not permission to inherit the parent model. omp fails that spawn outright; run setup-pstack or ask.

Two override layers sit above the shipped frontmatter, both in `~/.omp/agent/config.yml`: `modelRoles` moves every role reading a lane, and `task.agentModelOverrides` (a record keyed by agent name, e.g. `critic: "@pstack-review-c"`) retargets one agent without touching the plugin.

## Asking the user

Use the `ask` tool, not Cursor's `AskQuestion`. One decision per question: `id`, `question`, `header`, `options[{ label, description }]`, optional `multi`, optional `recommended` index. Do not ask when the source skill says to proceed on a stated best guess.

## Plans, todos, and long runs

- `todo` holds the parent's own plan. Children have it stripped; never put the parent's tracker in a brief.
- `goal` mode starts a fresh long-running session. `/loop` is a TUI mode the operator arms with a condition gate (`--until`/`--while`); a playbook can ask the operator to arm it, but no skill toggles it by itself.
- Children must skip build, lint, tests, and formatters mid-flight. Run the verification lane once, after edits freeze.

## Shell and processes

`bash` runs commands; a named long-running command is inspectable at `proc://<id>`. `wait` blocks on a job or service this session started. Do not poll by re-running a command.

## Session store

Transcripts live at `~/.omp/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl`, where `<encoded-cwd>` is the home-relative working directory with `/` replaced by `-`. `recall`, `reflect`, `show-me-your-work`, `automate-me`, and `session-pickup` read this store. A resumable session is identified by its id, not by mtime.

## Status line and lane routing

The plugin's extension draws exactly one line, `pstack: poteto-mode`, only after poteto-mode has been activated in the session. Activation is a monotonic latch detected from a `/skill:poteto-mode` dispatch or a read of `skill://poteto-mode`; prose that merely mentions poteto-mode does not match. The line renders when `statusLine.showHookStatus` is on (the default).

The same extension routes spawns onto lanes at `before_subagent_spawn`, which is where the three lane paths above are resolved. Routing is best-effort and total: a spawn whose brief this extension never saw keeps its frontmatter lane, and a failed lookup never blocks the spawn.

## No omp equivalent

- Cursor's cloud task environment. Use `isolated: true` or an explicit worktree.
- Cursor's `.cursor/rules` and `hooks.json`. This plugin uses `rules/` and an omp extension.
- Cursor's `mcps/` directory. Inspect the live MCP tools and read resources at `mcp://<uri>`.
- Cursor team-kit skills (`control-ui`, `control-cli`, `deslop`) and `cursor-team-kit`. Use the project's own commands.
- Bugbot's hosted review service. The triage rubric still applies to review comments from any bot.
- `api2.cursor.sh` and the Grok Bot webhook routine used by `make-bot-ui`.
