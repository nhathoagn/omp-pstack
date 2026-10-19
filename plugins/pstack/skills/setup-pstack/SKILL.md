---
name: setup-pstack
description: Configure which models pstack uses per role on omp. Detects your available omp models and writes `modelRoles` lanes in `~/.omp/agent/config.yml`. Use for /setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack

Write pstack's model lanes as `modelRoles` keys in `~/.omp/agent/config.yml`. The skills read a lane with `@pstack-*` and treat the lane as required. This file is the override layer: change a lane here instead of editing every skill. A lane the user never configured is a choice to make, not permission to inherit the parent model.

How a lane reaches a spawn: every pstack agent ships a frontmatter lane, a `lane: @pstack-<lane>` tag in a brief overrides it, and arms of a multi-arm panel take the panel lanes in order. All three resolve against the `modelRoles` keys written here. `omp config get modelRoles` is therefore the whole picture of what pstack runs on.

Run every command through `bash`. Do not hand-edit the YAML; `omp config` preserves the rest of the file.

## Step 1. Detect available models

```bash
omp models --json
```

Each entry carries `selector` (`provider/model`), `name`, and the thinking levels the model exposes. The selector is the only dependable source for what a task can spawn. Also check whether the optional external CLIs are present, and report the result without turning them into lanes:

```bash
command -v claude codex grok bun
```

`bun` runs pstack's bundled scripts. The CLIs are informational: omp can only spawn a model that its own providers expose, so do not write a CLI name as a model selector. If `omp models --json` fails or returns nothing, ask the user for the selectors they can use.

Two non-selector values are allowed in a lane: `*` (or its long form `@default`), which runs the role on your default model role, and a lane pointing at a selector you confirmed in this step. `inherit` is not a lane value; an agent with no `model` inherits its parent, and every pstack agent ships a lane. Never invent a selector. Never write one you have not confirmed.

## Step 2. Load current state

```bash
omp config get modelRoles --json
```

The output is an envelope, not the record: `{"key": "modelRoles", "value": {…}, "type": "record", "description": ""}`. Read the record from `value`. `omp config get modelRoles` without `--json` prints the bare record.

Treat existing `pstack-*` keys as the current choices. Every other key in `modelRoles` belongs to the user; preserve it untouched. If no `pstack-*` keys exist, start from the defaults in Step 3.

`omp config set` replaces the entire record for that key, so passing only the lanes deletes `modelRoles.default` and every other role the user configured. Always pass the merged record.

## Step 3. Map and confirm

The default lane set. The intent column is the family pstack was designed around; it is not a selector.

| Lane | Source roles it serves | Intent default |
|---|---|---|
| `pstack-code` | feature, refactoring, swarm workers | Grok 4.6 |
| `pstack-code-hard` | bug-fix, perf-issue, hillclimb, reflect tooling | GPT-5.6 Sol |
| `pstack-judgment` | judgment and prose, hardest tasks, how explainer, why synthesizer, reflect judgment/divergent/synthesizer | Fable 5 |
| `pstack-design` | single-arm design passes and `designer` sweeps; arena arms use the panel lanes | Opus 5 |
| `pstack-explore` | how explorer, why investigators, research | Grok 4.6 |
| `pstack-review-a` | multi-model panel: interrogate reviewer A, how critic 1, arena runner/judge, architect runner | Fable 5 |
| `pstack-review-b` | panel B | GPT-5.6 Sol |
| `pstack-review-c` | panel C | Grok 4.6 |
| `pstack-review-d` | panel D | Opus 5 |
| `pstack-security` | security-focused review split from ordinary review | GPT-5.6 Sol |

Match each intent family to a detected model by name or id. Prefer the highest reasoning tier the model exposes; pstack is rigor-first. Append it as `:<level>` using the `thinking` list from Step 1. If several detected models match one family, or a default family is absent, ask the user which selector to use for that lane.

Show every lane with its current value, mark any value that is not in the detected set (or `*`) as needing a choice, and ask once whether to accept the mapping or change specific lanes. Use the `ask` tool with one question per lane that needs a decision; offer detected selectors, `*`, and the current value when it is valid.

`*` is a real choice: the user is opting into their default model for that role. It is not a default to apply silently.

## Step 4. Validate

Every value written must be in the detected selector set or exactly `*`. If a chosen selector is not available, stop and ask again. A lane pointing at a model the user cannot spawn breaks every spawn that reads it, and omp reports it as `No model selected`.

Do not substitute a weaker model to make a default fit. An unavailable Fable 5, Sol, Grok 4.6, or Opus 5 is a question for the user, not a silent downgrade.

## Step 5. Write the lanes

Build one JSON object from the existing `modelRoles` record plus the confirmed `pstack-*` keys, then write the whole record:

```bash
omp config set modelRoles '{"default":"<unchanged>","pstack-code":"<selector>", ...}'
```

Rules:

- Preserve every non-pstack key exactly as read.
- Write all ten lanes, even when a lane repeats another value.
- Quote the JSON as a single shell argument.
- Re-running this step is idempotent: it replaces only the `pstack-*` values.

Confirm the write:

```bash
omp config get modelRoles --json
```

## Step 6. Confirm

Tell the user which file changed (`~/.omp/agent/config.yml`), that the lanes apply to new sessions, and that re-running this skill updates them. Mention that `pstack-security` can be set to the same selector as `pstack-code-hard` when the user does not want a separate security model.

Name the two other levers in the same file, so the user knows they exist: `task.agentModelOverrides` retargets one agent without touching the plugin (`{"critic": "@pstack-review-c"}`), and a `lane: @pstack-<lane>` tag in a delegate's brief overrides that single spawn. A lane set to `*` runs its role on the default model role.

## Step 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with `/skill:create-verification-skill`." On yes, invoke `/skill:create-verification-skill`. On no, move on without pushing.
