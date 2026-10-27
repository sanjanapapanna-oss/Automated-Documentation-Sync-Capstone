---
description: 'Stage 4 — produce a dependency-ordered impl-plan.md via the impl-planner agent'
argument-hint: '[optional: scope limit, e.g. a specific feature slice]'
allowed-tools: Task, Read, Write, Grep, Glob
---

# /impl-plan

**Purpose**: Produce `impl-plan.md`: a prioritized, dependency-ordered task breakdown.

**Required input**: approved `requirements.md` and `architecture.md`; `design-review.md` with
no open `Blocker` findings (or explicit human-accepted risks). Optional `$ARGUMENTS` to scope
the plan to part of the work.

**Steps**:

1. Verify preconditions (requirements/architecture approved, no open blockers). If not met,
   stop and tell the user what's missing.
2. Delegate to the `impl-planner` subagent.
3. Present the task list with dependencies, flagging any task that touches a security
   boundary, external integration, or destructive operation.

**Expected output**: `impl-plan.md` under `output/<user-story-slug>/`.

**Validation rules**: every requirement maps to at least one task; every task has acceptance
criteria and a verification command; blocked tasks are marked `BLOCKED` with a reason.

**Approval requirement**: do not commit `impl-plan.md`; do not begin `/implement` on any task
without the plan being reviewed by the user first.
