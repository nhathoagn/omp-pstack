### Authoring or modifying a skill

**You own the skill's voice.** Agent-facing prose has a higher bar than human prose; unhelpful sentences become instructions.

1. Follow this playbook's loop: draft `SKILL.md`, validate it, test it, iterate. When your install ships a skill-authoring skill (Cursor's `create-skill`, for example), use it for the draft / test / iterate loop; OMP installs without one run the loop by hand.
2. Validate the skill: frontmatter has `name` and `description`, referenced files exist, cross-skill links resolve.
3. Test cases if structural; skip if subjective.
4. Run **Opening a PR**.

When in doubt, delete; prose earns its keep by changing a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config); hardcoded details go stale (the **encode-lessons-in-structure** principle skill). Delegate to other skills by path; don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.
