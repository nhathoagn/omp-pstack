#!/usr/bin/env bash
# Mechanical + curated Cursor -> OMP translation for the skills copied from
# Lauren Tan's pstack. Idempotent: safe to run twice.
#
# Two stages:
#   1. Mechanical replacements below, applied in place.
#   2. scripts/curated.patch, a recorded diff for the context-dependent
#      rewrites (harness phrasing, model lanes, skill-invocation syntax) that
#      cannot be expressed as safe global substitutions. When upstream prose
#      changes, re-run this script and review the patch failures by hand.
#
# Hand-written files are NOT touched here: agents/*, rules/*, commands/*,
# docs/*, and the two adapter skills below. skills/setup-pstack is
# upstream-derived; the patch rewrites it wholesale.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS="$ROOT/plugins/pstack/skills"

command -v perl >/dev/null || { echo "perl required" >&2; exit 1; }

# The adapter skills document Cursor's vocabulary by name ("imported prose says
# `subagent_type`"), so the vocabulary substitutions below must not sweep them.
# Excluded here rather than by the patch stage, which never sees them.
ADAPTERS="omp-mechanics pstack-omp"

# Markdown under skills/, minus the adapters.
skills_md() {
  find "$SKILLS" -name '*.md' \
    -not -path "$SKILLS/omp-mechanics/*" \
    -not -path "$SKILLS/pstack-omp/*" \
    -print0
}

# 1. Frontmatter `name:` must equal the skill directory name. OMP keys skills on
#    `frontmatter.name`, so upstream's "Poteto Mode" would never answer to
#    /skill:poteto-mode and skill://poteto-mode would 404.
for dir in "$SKILLS"/*/; do
  skill="$dir/SKILL.md"
  [ -f "$skill" ] || continue
  base="$(basename "$dir")"
  case " $ADAPTERS " in *" $base "*) continue ;; esac
  perl -0pi -e "s/^name:[^\n]*\n/name: $base\n/m" "$skill"
done

# 2. Cursor's per-skill bash pre-approval has no OMP counterpart; approval is
#    session-level. Drop the key wherever it appears.
skills_md | xargs -0 perl -0pi -e 's/^allowed-tools:[^\n]*\n//mg'

# 3. Harness vocabulary, longest patterns first so a broad rule never eats a
#    narrow one. Cursor's Task tool with subagent_type maps onto OMP's `task`
#    tool with `agent`.
skills_md | xargs -0 perl -0pi -e '
  s/subagent_type: "poteto-agent"/agent: "poteto-agent"/g;
  s/subagent_type: "Comment Sicko"/agent: "comment-sicko"/g;
  s/subagent_type: "generalPurpose"/agent: "task"/g;
  s/subagent_type: generalPurpose/agent: "task"/g;
  s/\`subagent_type\`/\`agent\`/g;
  s/\`AskQuestion\`/\`ask\`/g;
  s/\bAskQuestion\b/the ask tool/g;
  s/\brun_in_background: true/background: true/g;
  s/\`run_in_background\`/\`background\`/g;
  s/\brun_in_background\b/background/g;
  s/\bTask tool\b/task tool/g;
  s/Cursor cloud agents/background OMP subagents/g;
  s/Cursor cloud agent/background OMP subagent/g;
'

# 4. Model-role config path. Cursor stored the mapping in an always-applied
#    .mdc rule; OMP stores it as `modelRoles` in ~/.omp/agent/config.yml.
skills_md | xargs -0 perl -0pi -e '
  s{\`~/\.cursor/rules/pstack-models\.mdc\`}{\`~/.omp/agent/config.yml\` modelRoles}g;
'

# 5. Skill and transcript locations. User-level paths first: the project-level
#    rewrite would otherwise also match inside them.
skills_md | xargs -0 perl -0pi -e '
  s{~/\.cursor/skills/}{~/.omp/agent/skills/}g;
  s{~/\.cursor/plugins/}{~/.omp/plugins/}g;
  s{\`~/\.cursor/projects/\*/\`}{\`~/.omp/agent/sessions/*/\`}g;
  s{\`~/\.cursor/projects/\*/}{\`~/.omp/agent/sessions/*/}g;
  s{~/\.cursor/projects/\*/\*}{~/.omp/agent/sessions/**}g;
  s{~/\.cursor/projects/<slug>/agent-transcripts/<uuid>/<uuid>\.jsonl}{~/.omp/agent/sessions/<encoded-cwd>/<timestamp>_<uuid>.jsonl}g;
  s{\.cursor/skills/}{.omp/skills/}g;
'

# 6. Curated translations recorded as a patch. See the header. Run from the
#    repo root; `git apply --check` first so a second run is a no-op. The
#    `patch` fallback uses --forward --batch so an applied patch is skipped,
#    never reversed.
PATCH="$ROOT/scripts/curated.patch"
if [ -f "$PATCH" ]; then
  if (cd "$ROOT" && git apply --check "$PATCH" 2>/dev/null); then
    (cd "$ROOT" && git apply "$PATCH")
    echo "port-apply: applied curated.patch"
  elif (cd "$ROOT" && patch -p1 --dry-run --forward --batch --silent < "$PATCH" >/dev/null 2>&1); then
    (cd "$ROOT" && patch -p1 --forward --batch --silent < "$PATCH")
    echo "port-apply: applied curated.patch (patch fallback)"
  else
    echo "port-apply: curated.patch did not apply; the tree is already curated," >&2
    echo "or upstream drifted. Inspect with: (cd $ROOT && git apply --check -v scripts/curated.patch)" >&2
  fi
fi

echo "port-apply: translated skills under $SKILLS"
