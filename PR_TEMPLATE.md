<!--
Pull Request description template used by Stage 8 (`pr-preparer` / `/prepare-pr`).
Every field below must come from a command actually run, or a file actually read, in the
session that prepared this PR. Never fill a section with an invented value — write
"Not available" and explain why instead.
-->

## Summary

{{2-3 sentences: what was built and why}}

## Changes Made

- `{{path}}` — {{reason for the change}}

## Test Evidence

{{Paste the actual relevant excerpt from verification-report.md here: commands run, pass/fail
counts, exit codes. Link a real CI run only if one exists — omit the field otherwise.}}

## Known Limitations

- {{Fields resolved as "Not Found" or "Not Specified" and why}}
- {{Unresolved issues carried from design-review.md / code-review-report.md}}
- {{Integrations that were unavailable during this run}}
- {{Explicitly out-of-scope functionality}}

## Reviewer Checklist

- [ ] Meets `requirements.md` acceptance criteria
- [ ] Matches approved `architecture.md`
- [ ] No secrets or credentials introduced
- [ ] Input validation and error handling present at all boundaries
- [ ] Test coverage includes edge cases (missing/empty/malformed/API-failure)
- [ ] Output documents preserve the master template's structure and field order
- [ ] Documentation (`README.md` / `CHANGELOG.md`) updated

---

_Commits included:_ {{real `git log` output}}
_Files changed:_ {{real `git diff --stat` output}}
