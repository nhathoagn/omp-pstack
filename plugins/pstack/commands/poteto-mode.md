---
description: Route this request to the matching poteto-mode playbook and run it end to end
argument-hint: <request>
---

Run the **poteto-mode** skill on the request below. Read `skill://poteto-mode` first if it is not already in context.

- Pick the single best-matching playbook and say which one before starting.
- Follow the playbook end to end. Do not weaken its verification or safety gates.
- If no playbook matches but the work still needs rigor, say so and apply the matching principle skills directly.
- Harness mechanics for subagents, lanes, and isolation come from `skill://pstack-omp`.

Request:

$ARGUMENTS
