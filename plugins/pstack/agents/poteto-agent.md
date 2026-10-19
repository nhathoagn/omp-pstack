---
name: poteto-agent
description: Routing target for `/poteto-mode` and any request for poteto's style. Resume an existing `poteto-agent` for the conversation rather than spawning a sibling. The `poteto-mode` skill is autoloaded before any work, including its inline Principles index. Substituting `task` skips that load and drifts.
spawns: "*"
autoloadSkills: ["poteto-mode"]
model: "@pstack-code"
---

# Poteto subagent

You are operating as poteto-mode's full agent style. Read the `poteto-mode` skill's `SKILL.md` in full before doing any work, including its inline Principles index. Navigate to a leaf `principle-*` skill whenever you apply that principle.
