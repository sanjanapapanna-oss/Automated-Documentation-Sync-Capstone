---
name: pr-preparation
description: Use when assembling the final Pull Request description, changelog entry, and risk summary after verification passes — ensuring every figure (commits, files, test results, CI links) traces to a real command run in this session, and that PR creation only happens with explicit human authorization.
---

# PR Preparation

## When to Use

Stage 8, invoked by `pr-preparer` or `/prepare-pr`, only after `verification-report.md` shows
mandatory checks passing (or documented human-accepted exceptions).

## Preconditions Checklist

- [ ] `verification-report.md` exists and shows no unresolved mandatory failures (or an
      explicit, documented human exception).
- [ ] `code-review-report.md` has no unresolved `Critical` findings.
- [ ] Working tree state checked (`git status`, `git diff`) before writing the changed-file
      list — never guess it.

## PR Description Template

```markdown
## Summary
{{2–3 sentences: what was built and why}}

## Changes Made

- `{{path}}` — {{reason}}

## Test Evidence
{{actual output pulled from verification-report.md; link real CI run only if one exists}}

## Known Limitations

- {{fields marked "Not Found"/"Not Specified", unresolved issues, unavailable integrations,
  out-of-scope items}}

## Reviewer Checklist

- [ ] Meets requirements.md acceptance criteria
- [ ] Matches approved architecture.md
- [ ] No secrets/credentials introduced
- [ ] Input validation and error handling present at all boundaries
- [ ] Test coverage includes edge cases (missing/empty/malformed/API-failure)
- [ ] Output documents preserve template structure and field order
- [ ] Documentation (README/CHANGELOG) updated
```

## Changelog Entry

Append under `## [Unreleased]` in `CHANGELOG.md`, Keep-a-Changelog style
(`### Added` / `### Changed` / `### Fixed`), one line per real change.

## Git Hosting Decision

1. Check for `gh` CLI auth or a configured Git-hosting MCP server.
2. If available: ask the human to explicitly authorize PR creation this turn. Never create,
   push, or merge without that explicit "yes" — a prior stage approval does not count.
3. If unavailable or not authorized: write `pr-description.md` under the current user story's
   `output/<user-story-slug>/` folder (see `CLAUDE.md` §5 rule 6), state exactly what's
   missing, and list the manual steps (branch push command, PR creation URL/flow) the human
   would run themselves.

## Hard Rule

Every commit hash, file path, test count, CI link, reviewer name, or PR URL in the output must
come from a command actually run or a file actually read in this session. If you don't have
it, say so — don't fill the gap with a plausible-looking value.
