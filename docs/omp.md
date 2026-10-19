# omp (Oh My Pi)

omp-pstack is the omp distribution of [pstack](https://github.com/cursor/plugins/tree/main/pstack), Lauren Tan's engineering workflows for coding agents. This repository is a harness port. The workflow logic is hers; the harness vocabulary is omp's. Nothing in the port weakens a playbook's verification or safety gates.

omp is the only target. The repository ships its own marketplace catalog at `.omp-plugin/marketplace.json`, and the plugin lives at `plugins/pstack`.

## Install

```shell
omp plugin marketplace add <owner>/omp-pstack
omp plugin install pstack@omp-pstack
```

Local checkout (development):

```shell
omp plugin install ./plugins/pstack --local
```

The marketplace name is `omp-pstack`; the plugin name is `pstack`, so the install selector is `pstack@omp-pstack`. After install, every skill is reachable as `/skill:<name>` (`/skill:poteto-mode`, `/skill:how`, ...) and every command as `/pstack:<name>` (`/pstack:poteto-mode`, `/pstack:how`, ...). Marketplace plugins namespace their commands by plugin name. Files inside a skill are readable at `skill://<name>/<relative-path>`, so playbooks live at `skill://poteto-mode/playbooks/<name>.md`.

Verify the install by name resolution rather than by `omp plugin doctor`:

```shell
omp plugin list                 # lists pstack@omp-pstack
omp read skill://poteto-mode    # the skills resolve from any directory
```

`omp plugin doctor` is broken in omp 18.12.1 for every installed plugin (`TypeError: The "paths[1]" property must be of type string, got array` inside `dist/cli.js`); it is an upstream crash, not a plugin problem.

## What the port changed

The port keeps every skill, playbook, principle, and agent prompt 1:1 in intent. It rewrites only the harness sentences that name a Cursor-only mechanism. The live contract is `skill://pstack-omp`; the workflow-specific amendments are in `skill://omp-mechanics`.

| Upstream (Cursor) | Here (omp) |
|---|---|
| `Task` tool + `subagent_type` | `task` tool + `agent` |
| `readonly` spawn flag | Read-only is an agent tool allowlist (`read`, `grep`, `glob`, `find`, `ast_grep`). MCP tools stay mounted for every child. |
| `environment: "cloud"` | Local subagents. `isolated: true` gives a child its own worktree when `task.isolation.enabled` is on. |
| `run_in_background` | Async is the default; `blocking: true` agents return inline. |
| `AskQuestion` | The `ask` tool (one decision per question, options + recommended index). |
| Cloud workers, cloud roots, cloud VMs | Local workers in disjoint worktrees. OMP has no cloud-worker mode. |
| `control-ui` / `control-cli` / `deslop` from `cursor-team-kit` | Conditional: "when your install ships one". On omp, drive the surface directly and skip the slop-strip unless a project skill provides one. |
| `~/.cursor/projects/*/agent-transcripts/*.jsonl` | `~/.omp/agent/sessions/<cwd-bucket>/<timestamp>_<uuid>.jsonl` |
| `~/.cursor/rules/pstack-models.mdc` | `modelRoles` in `~/.omp/agent/config.yml` |
| Cursor's `create-skill` | The authoring playbook, `skill://poteto-mode/playbooks/authoring-a-skill.md` |
| Cursor's `/loop` | omp's `/loop` TUI mode with `--until` / `--while` condition gates |
| Cursor model names in prompts (`grok-4.6-fast-xhigh`, `gpt-5.6-sol-max`) | Lane selectors (`@pstack-code`, `@pstack-code-hard`, ...) |
| Cursor plugin `hooks.json` | `rules/pstack-session-mandate.md`, injected by omp's plugin rule discovery |

Every Cursor-only sentence that could not be translated to a live omp mechanism is phrased conditionally and stays harmless when the mechanism is absent. `skill://name` references are internal paths; user-facing invocations are `/skill:<name>` or the bare command.

## Skills, commands, rules

- **Skills.** All 45 upstream skills are ported, plus two adapters: `pstack-omp` (task, model, and runtime mechanics) and `omp-mechanics` (per-workflow amendments). `poteto-mode` keeps its 23 playbooks under `skills/poteto-mode/playbooks/`.
- **Commands.** `commands/` ships shortcuts that dispatch to the matching skill: `/pstack:poteto-mode`, `/pstack:how`, `/pstack:why`, `/pstack:architect`, `/pstack:interrogate`, `/pstack:arena`, `/pstack:reflect`, `/pstack:setup-pstack`. Marketplace plugins namespace their commands by plugin name; each one expands to a prompt that reads the skill and follows it end to end.
- **Rule.** `rules/pstack-session-mandate.md` carries `alwaysApply: true` and one line: *New task? Playbook match or rigor needed -> apply /poteto-mode*. omp injects it into every session's system prompt from the installed plugin; there is no paste-into-AGENTS.md step.

## Agents

Nine task agents ship in `agents/`:

| Agent | Role | Read-only |
|---|---|---|
| `poteto-agent` | Full poteto style; `poteto-mode` is autoloaded before work. Async. | no |
| `comment-sicko` | Comment deletion and workaround condemnation. Report only. | no |
| `explorer` | One exploration angle for a "how" question. | yes |
| `critic` | Architectural critique of an existing explanation, and the arena cross-judge. | yes |
| `code-reviewer` | Adversarial diff review with the pstack rubric and quality lens. | yes |
| `lead-judgment` | Filters reviewer findings into Act On / Consider / Noted / Dismissed. | yes |
| `designer` | One architect candidate design package in an isolated directory. | writes design files only |
| `investigator` | One historical source for a "why" question. Keeps MCP. | posture only |
| `synthesizer` | Merges parallel findings using the named template. Keeps MCP. | posture only |

`poteto-agent` and `comment-sicko` are ported from upstream. The other seven promote upstream's inline prompt templates to first-class agents; each reads its authoritative template through `skill://` before working. The seven read-only agents declare an explicit builtin tool allowlist; mounted MCP tools remain available to every agent regardless (allowlists gate builtins only), and `investigator` / `synthesizer` carry their write ban as an instruction, not a sandbox.

## Model lanes

`setup-pstack` writes ten lane keys under `modelRoles` in `~/.omp/agent/config.yml`:

| Lane | Serves | Intent default |
|---|---|---|
| `pstack-code` | feature and refactoring implementation, swarm workers | Grok 4.6 |
| `pstack-code-hard` | bug-fix, perf-issue, hillclimb, reflect tooling | GPT-5.6 Sol |
| `pstack-judgment` | judgment and prose, hardest tasks, explainers, synthesizers | Fable 5 |
| `pstack-design` | single-arm design passes and `designer` sweeps | Opus 5 |
| `pstack-explore` | explorers, investigators, research | Grok 4.6 |
| `pstack-review-a` .. `pstack-review-d` | the multi-model panel: interrogate reviewers, how critics, arena runners and judges, architect runners | Fable 5 / GPT-5.6 Sol / Grok 4.6 / Opus 5 |
| `pstack-security` | security-focused review split from ordinary review | GPT-5.6 Sol |

Cursor's `Task` tool took a `model` argument per call. omp's `task` does not: it rejects one with `` `model` is only accepted for the `seance` agent``, and `seance` is a read-only consult on a saved session rather than a spawn. Lanes therefore reach a spawn through three paths, all resolved by the plugin extension at `before_subagent_spawn`:

1. The agent's own frontmatter, `model: "@pstack-<lane>"`. Every pstack agent ships one, so a spawn lands on its lane with no instruction from the parent.
2. A `lane: @pstack-<lane>` tag in the brief, which wins over the frontmatter and is how one agent plays several roles (`poteto-agent` tagged `lane: @pstack-code-hard`).
3. The panel order: arms of one multi-arm `critic`, `code-reviewer`, or `designer` batch take `pstack-review-a` .. `pstack-review-d` by position, so a race runs one model per arm even when the parent tags nothing.

Two behaviors differ from the Cursor original and are documented as deliberate. A lane with no configured value fails its spawn outright with `No model selected` rather than quietly running on another model, which is the strictest reading of pstack's own no-silent-fallback rule. And `*` (or `@default`) is the supported value for "run this role on my default model"; `inherit` is not a lane value in omp. `task.agentModelOverrides` in the same config file retargets a single agent without touching the plugin.

The intent column names the family pstack was designed around; it is not a selector. `setup-pstack` detects what your install actually has, validates every choice against the model registry, and asks about any lane whose default is absent.

## Status line and lane routing

The plugin ships a runtime extension (`extension/index.js`, with `extension/lanes.js` for routing) that draws one line, keyed `pstack`, only in sessions where poteto-mode has been activated:

```
pstack: poteto-mode
```

Activation is a one-way latch, detected from the session's own events: a user turn carrying the skill-dispatch marker (`User invoked the "poteto-mode" skill`), or a tool execution whose arguments read the skill (`skill://poteto-mode`, or a path ending in `skills/poteto-mode/SKILL.md`). Prose that merely mentions poteto-mode matches nothing. `session_start` rescans the journal so a resumed session keeps its line. The line renders when `statusLine.showHookStatus` is on (the schema default). Every draw is event-driven; a failed draw is a no-op.

The same extension resolves spawn lanes. It captures each `task` call at `tool_call` time (omp awaits that event at argument-prep, before the tool is scheduled), then answers `before_subagent_spawn` with the lane the spawn should run on: the brief's `lane:` tag when present, else the panel lane for the arm's position. Routing is total and best-effort: an unmatched spawn or a failed lookup leaves the spawn on its frontmatter lane, and no path ever blocks a spawn. `scripts/test-extension.mjs` covers both responsibilities against a fake `pi` with no network.

## Session store

Transcripts live at `~/.omp/agent/sessions/<cwd-bucket>/<timestamp>_<uuid>.jsonl`, where `<cwd-bucket>` is the home-relative working directory with `/` replaced by `-`. The sibling directory `<timestamp>_<uuid>/` holds that session's artifacts. `recall`, `reflect`, `show-me-your-work`, `automate-me`, and `session-pickup` read this store. A child's transcript is at `history://<id>`; its final report is at `agent://<id>`.

## Port maintenance

`scripts/port-apply.sh` reproduces the ported tree from a fresh copy of upstream in two stages: mechanical vocabulary substitutions, then `scripts/curated.patch` for the context-dependent rewrites. Running it twice is safe. To re-sync after upstream changes: copy the upstream `skills/` tree over, run the script, and review any patch failures by hand.

## Known deltas

- `make-bot-ui` keeps its UI work. Its Grok Bot webhook targets `api2.cursor.sh`, which has no omp equivalent; skip the deployment step.
- Graphite (`gt`), GitHub review bots, and Bugbot triage stay as-is: they are host tools, not Cursor tools. `orchestrate` prefers `gh` where you have no `gt`.
- The marketplace catalog lists the owner as `nhathoang` (cosmetic). Upstream `homepage` / `repository` fields point at `cursor/plugins` for attribution; change them to your fork if you publish elsewhere.

## Credits

pstack is by [Lauren Tan](https://x.com/poteto) and lives at [cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack), MIT licensed. This port follows the same license; see `LICENSE` and `NOTICE`.
