---
description: 'Stage 6 — structured code review across correctness, security, error handling, tests, clarity, DRY, dependencies, architecture compliance, and documentation quality'
argument-hint: '[optional: specific files/components to focus on]'
allowed-tools: Task, Read, Grep, Glob, Bash, Edit
---

# /code-review

**Purpose**: Produce `code-review-report.md` covering all nine required review areas (see
`skills/secure-code-review/SKILL.md`).

**Required input**: implementation from Stage 5 exists. Optional `$ARGUMENTS` to focus the
review.

**Steps**:

1. Delegate to the `code-reviewer` subagent.
2. Present findings by severity. For each, ask the user: fix now (agent applies edit and
   reruns the relevant check), or explicitly accept and document.
3. Do not suppress any `Critical` finding without a recorded human decision.

**Expected output**: `code-review-report.md` under `output/<user-story-slug>/`.

**Validation rules**: all nine review areas addressed; every finding has file:line evidence
and a recommended fix; fixed findings show a rerun result.

**Approval requirement**: do not commit review fixes without explicit authorization. Stage 7
(`/verify`) should not be treated as passing while unresolved `Critical` findings remain
undocumented.
