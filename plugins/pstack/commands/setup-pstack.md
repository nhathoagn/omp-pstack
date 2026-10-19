---
description: Detect available models and configure the pstack model lanes
argument-hint: [lane=model ...]
---

Run the **setup-pstack** skill. Read `skill://setup-pstack` first if it is not already in context, then follow its steps: detect providers and models, map the ten `pstack-*` lanes, confirm each choice with the user, validate every selector, and write the merged `modelRoles` record to `~/.omp/agent/config.yml` without touching unrelated keys.

Lane choices the user already stated (optional; anything missing gets asked):

$ARGUMENTS
