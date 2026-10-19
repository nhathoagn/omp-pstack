---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

Fan out N parallel workers. They may cover separate slices, race the same brief, or mix both. The parent waits, aggregates, and returns one report.

## Start

Open a todolist with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Set N from the user or derive it from the shape. N is total workers, not a concurrency cap.
4. Pick the worker lane from the configured swarm workers (`@pstack-code` by default, which `poteto-agent` already carries; set up by `/skill:setup-pstack`). For a model race, tag each arm's brief with its lane up front (`lane: @pstack-review-b`).
5. Give each worker its own writable output when it writes. Use a worktree (spawn with `isolated: true`), branch, or `/tmp/swarm-<slug>/worker-<n>/`.

## Phase B: Fan out

Spawn all N workers in one message with `agent: "poteto-agent"`, tagging each brief with its lane when the race assigns one. Workers run in the local environment; OMP has no cloud-worker mode, so a worker that needs a pushed branch or an isolated checkout starts from a worktree you hand it (`isolated: true`) instead.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.
