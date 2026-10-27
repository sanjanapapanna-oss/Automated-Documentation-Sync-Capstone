---
description: 'Stage 8 — prepare the complete PR description, changelog entry, and risk summary; create the PR only with explicit authorization'
argument-hint: '[optional: target branch name]'
allowed-tools: Task, Read, Write, Bash, Grep, Glob
---

# /prepare-pr

**Purpose**: Prepare all PR artifacts and, only if explicitly authorized, open the PR.

**Required input**: `verification-report.md` showing mandatory checks passing (or documented
human-accepted exceptions). Optional `$ARGUMENTS` for the target branch.

**Steps**:

1. Confirm the verification gate is satisfied; if not, stop and report what's blocking.
2. Delegate to the `pr-preparer` subagent to build: PR description (Summary, Changes Made,
   Test Evidence, Known Limitations, Reviewer Checklist), a `CHANGELOG.md` entry, a final
   verification summary, an outstanding-risks summary, and the real commit/changed-file list.
3. Check whether `gh` or a Git-hosting MCP server is available and authenticated.
4. **Ask explicitly** whether the user authorizes creating the PR now. If yes and tooling is
   available, create it. If no, or tooling is unavailable, save the artifacts locally (e.g.
   `output/<user-story-slug>/pr-description.md`) and explain the exact remaining manual steps.

**Expected output**: PR description, changelog entry, outstanding-risks summary, commit/file
list — plus an actual PR if authorized and tooling is available.

**Validation rules**: no invented commit hashes, test numbers, CI links, reviewers, or PR URLs
— everything traces to a command run in this session.

**Approval requirement**: creating, pushing, or merging a PR always requires explicit human
authorization in this turn, regardless of any earlier stage approval.
