---
description: 'Stage 3 — critically review architecture.md and produce design-review.md via the design-reviewer agent'
argument-hint: '[optional: specific area to focus the review on]'
allowed-tools: Task, Read, Write, Edit, Grep, Glob
---

# /design-review

**Purpose**: Produce `design-review.md`: a critical review of `architecture.md` with
severity-rated findings.

**Required input**: an existing `architecture.md`. Optional `$ARGUMENTS` to focus the review
(e.g. "focus on the Jira integration boundary").

**Steps**:

1. Delegate to the `design-reviewer` subagent with `architecture.md` and `requirements.md`.
2. Present findings grouped by severity. For each `Blocker`/`Major` finding, ask the user:
   fix it now (agent applies an approved edit to `architecture.md`), accept the risk
   (record it as an Accepted Risk with the user's reasoning), or defer (keep as unresolved
   blocker).
3. Confirm the final blocker list with the user before closing the stage.

**Expected output**: `design-review.md` under `output/<user-story-slug>/`, plus any
user-approved edits applied to `architecture.md`.

**Validation rules**: every finding has severity, evidence, impact, and recommended action;
accepted risks are explicitly separated from unresolved blockers.

**Approval requirement**: Implementation Planning (`/impl-plan`) must not run while any
`Blocker` remains unresolved and unaccepted. Do not commit either file without explicit
authorization.
