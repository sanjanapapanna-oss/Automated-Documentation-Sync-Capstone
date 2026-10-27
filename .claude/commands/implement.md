---
description: 'Stage 5 — implement one or more approved impl-plan.md tasks via the implementer agent'
argument-hint: "[task ID(s) from impl-plan.md, or 'next' for the next unblocked task]"
allowed-tools: Task, Read, Write, Edit, Bash, Grep, Glob
---

# /implement

**Purpose**: Implement approved, unblocked task(s) from `impl-plan.md`.

**Required input**: `$ARGUMENTS` — task ID(s) from `impl-plan.md`, or `next` to pick the next
unblocked task in dependency order.

**Steps**:

1. Look up the task(s) in `impl-plan.md`; refuse (and report why) any task marked `BLOCKED`.
2. Delegate to the `implementer` subagent for each task, following `architecture.md`.
3. If the agent flags a consequential action (new dependency, destructive operation, scope
   change), stop and get explicit user approval before it proceeds.
4. Require the agent to run and show the task's verification command output before marking it
   done.

**Expected output**: source code and tests for the task(s), with real command output as
evidence of passing.

**Validation rules**: no task may be reported complete without an actually-executed
verification command and its real output; new dependencies require explicit approval.

**Approval requirement**: implementation itself may proceed once the plan is approved, but
consequential changes within implementation still require per-instance approval. Commits
still require explicit authorization.
