---
description: 'Stage 7 — run the full verification suite and produce verification-report.md from real command output'
argument-hint: "[optional: subset to run, e.g. 'unit' or 'docs-validation']"
allowed-tools: Task, Read, Write, Bash, Grep, Glob
---

# /verify

**Purpose**: Produce `verification-report.md` from actually-executed checks.

**Required input**: implementation from Stage 5 (and any Stage 6 fixes) exists. Optional
`$ARGUMENTS` to run a subset.

**Steps**:

1. Delegate to the `verifier` subagent to run all mandatory checks listed in
   `skills/test-strategy/SKILL.md` (unit, integration, doc-sync edge cases, security/dependency
   checks, static analysis, output-document validation, regression tests).
2. Report real pass/fail counts and command output; list anything not executed under "Known
   Limitations" rather than treating it as passed.

**Expected output**: `verification-report.md` under `output/<user-story-slug>/`.

**Validation rules**: every reported result traces to an executed command in this session; no
fabricated output; overall status must not read "Verified" if a mandatory check failed or
didn't run.

**Approval requirement**: `/prepare-pr` must not run while `verification-report.md` shows
unresolved mandatory failures without an explicit, documented human exception.
