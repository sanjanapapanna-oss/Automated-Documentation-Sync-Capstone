# Design Review: Automated Technical Documentation Sync (v1)

## Scope

Reviewed `architecture.md` (v2, all four prior decisions confirmed) against `requirements.md`
(v4, 11 FRs / 5 NFRs / 15 ACs). Reviewer stance: critical, as if encountering this design for
the first time — not confirming the author's own assumptions.

## Findings

### Finding 1 — Major — Flag allow-list as stated would reject `--help`/`--version`

- **Location**: `architecture.md`, Config Loader component + "Decisions Confirmed" section.
- **Evidence**: NFR-3's confirmed allow-list is stated as _exactly_ `--template`, `--repo`,
  `--output`, `--ci`. `commander` (the chosen CLI library) provides `--help`/`-h` and
  `--version`/`-V` by default. As written, a fail-closed check against that exact allow-list
  would reject `doc-sync --help` as an unrecognized/potentially-secret flag — breaking basic
  CLI usability. There's also an unaddressed interaction: `commander` itself may reject an
  unknown option before the custom NFR-3 logic ever runs, depending on configuration, which
  could produce an uncontrolled error message instead of the "never echo the value" guarantee
  NFR-3 requires.
- **Impact**: a real, concrete bug if implemented literally as specified — not hypothetical.
- **Recommended action**: clarify that the allow-list implicitly includes `commander`'s
  standard meta-flags (`--help`/`-h`, `--version`/`-V`), and that `commander` must be
  configured to defer unknown-option handling to the Config Loader's own NFR-3 logic (e.g. via
  `.allowUnknownOption()` plus explicit validation), not its own default rejection.

### Finding 2 — Major — No per-field error containment at the Field Resolver/Extractor boundary

- **Location**: `architecture.md`, Field Resolver + Error-Handling Strategy table.
- **Evidence**: the Error-Handling table's only catch-all is "any unhandled exception ...
  top-level `try/catch` in the CLI Entry Point ... generic tool-level failure exit." There is
  no stated behavior for an unexpected error on a _single_ field's extraction (e.g.
  permission-denied reading one specific evidence file in an otherwise fully accessible,
  non-empty repository). As designed, that single-field error would propagate all the way to
  the top-level catch and fail the _entire_ run with no manifest produced — even though nine
  other fields may have resolved just fine.
- **Impact**: contradicts the spirit of FR-8(b)/NFR-1 (evidence-absence should degrade
  gracefully to "Not Found," not fail the whole run) even though it technically satisfies the
  literal "never crash" wording via the generic top-level catch.
- **Recommended action**: the Field Resolver (or the call site invoking each field's lookup)
  should catch unexpected per-field errors and resolve that field to `"Not Found"` with an
  internal diagnostic note, reserving true tool-level failures for the three FR-8(a) cases,
  which are checked once, up front (template path, repo path, template parse) — not per field.

### Finding 3 — Major, Accepted-Risk candidate — Source-repo secrets could be copied into the generated manifest

- **Location**: `architecture.md`, Security Boundaries section (currently silent on this).
- **Evidence**: the Node.js/TypeScript Extractor reads `Dockerfile` and CI workflow YAML files
  from the repository being _documented_. If that repository has a credential hardcoded in one
  of those files (e.g. `ENV API_KEY=...` in a `Dockerfile`, or a literal token in a workflow
  step), the extractor would faithfully treat it as evidence and the Output Renderer would
  copy it into the generated manifest. `requirements.md`'s Out-of-Scope section already and
  correctly decided not to build a general secret-scanning engine for arbitrary content — a
  reasonable scope call — but `architecture.md`'s own Security Boundaries section never
  surfaces this residual exposure; a reader of just `architecture.md` wouldn't know it exists.
- **Impact**: a generated manifest could unintentionally republish a secret that was already
  (mistakenly) committed in the documented repository, if it happens to sit in one of the
  specific files the extractor reads.
- **Recommended action**: add an explicit "Accepted Risk" note to Security Boundaries
  acknowledging this, consistent with the scope decision already made in `requirements.md` —
  documentation, not new engineering.

### Finding 4 — Minor — No deterministic tie-break rule for multi-candidate evidence

- **Location**: `architecture.md`, Node.js/TypeScript Extractor.
- **Evidence**: if a lookup rule has multiple candidate matches (e.g. more than one file under
  `.github/workflows/*.yml`), the design doesn't state a selection rule. Relying on OS
  directory-iteration order risks a subtle NFR-2 (determinism) violation in edge cases.
- **Recommended action**: specify a deterministic rule (e.g. lexicographic filename sort,
  explicit "first match wins" after sorting) for any lookup rule with multiple candidates.

### Finding 5 — Minor/Note — Output Validator's AC-6 check verifies presence, not accuracy

- **Location**: `architecture.md`, Output Validator.
- **Evidence**: as designed, the validator confirms a "found" value _has_ an attached evidence
  pointer — it doesn't independently re-verify that the pointer is correct. True AC-6
  compliance (no invented values) ultimately depends on each extractor's lookup-rule
  correctness, verified via Code Review and targeted tests, not a generic runtime guarantee.
- **Recommended action**: state this limitation explicitly in the Output Validator's
  responsibility description, so it isn't later mistaken for a complete runtime guarantee of
  AC-6.

## What's Working Well (not findings, for balance)

- Component count (11) is justified — every component traces to a specific FR/NFR/AC; no
  speculative abstractions found.
- FR-8(b) (empty/partial repository) is architected as a natural consequence of normal
  extractor logic rather than a separate code path — this is exactly what prevents it from
  silently drifting back into being treated as a failure (the mistake `requirements.md` v1–v3
  made and v4 fixed).
- The "only Config Loader touches `argv`/env" constraint is enforced by the dependency
  structure itself (no other component's inputs include env), not just a convention.

## Severity Summary

| #   | Severity                        | Area                        | Disposition                    |
| --- | ------------------------------- | --------------------------- | ------------------------------ |
| 1   | Major                           | CLI usability / NFR-3       | **Fixed** in architecture.md   |
| 2   | Major                           | Reliability (NFR-1/FR-8(b)) | **Fixed** in architecture.md   |
| 3   | Major (Accepted-Risk candidate) | Security                    | **Accepted Risk** — documented |
| 4   | Minor                           | Determinism (NFR-2)         | **Fixed** in architecture.md   |
| 5   | Minor/Note                      | Validation clarity (AC-6)   | **Fixed** in architecture.md   |

## Unresolved Blockers vs. Accepted Risks

**Unresolved Blockers**: none. Findings 1, 2, 4, and 5 were fixed directly in
`architecture.md`. Finding 3 is recorded as an explicit Accepted Risk, consistent with the
scope decision already made upstream in `requirements.md` — not a blocker.

**Implementation Planning gate**: satisfied — see Resolution Log.

## Resolution Log

Decisions made autonomously per explicit human instruction to complete the full SDLC cycle
without per-step approval (2026-10-14) — using the recommended disposition for each finding:

- **Finding 1 (Fixed)**: Config Loader now pre-scans raw `argv` before `commander` parses it;
  the allow-list explicitly includes `--help`/`-h`/`--version`/`-V` alongside
  `--template`/`--repo`/`--output`/`--ci`, so `commander`'s own unknown-option handling never
  fires and the NFR-3 guarantee holds for every rejection path.
- **Finding 2 (Fixed)**: Field Resolver now contains errors per field — an unexpected error on
  one evidence file resolves only that field to `"Not Found"`, never the whole run. Tool-level
  failures stay limited to the three FR-8(a) cases, checked once up front.
- **Finding 3 (Accepted Risk)**: documented explicitly in `architecture.md`'s Security
  Boundaries as "Accepted risk — secrets committed in the documented repository," consistent
  with the scope decision already made in `requirements.md`'s Out-of-Scope section. No new
  engineering added.
- **Finding 4 (Fixed)**: Node.js/TypeScript Extractor now sorts multi-candidate evidence files
  lexicographically before picking one, removing the OS-directory-order dependency.
- **Finding 5 (Fixed)**: Output Validator's description now states its AC-6 check verifies
  evidence-pointer presence, not accuracy, and that full AC-6 compliance depends on extractor
  correctness verified at Code Review.

**Final gate status**: zero unresolved blockers, zero undocumented accepted risks. Design
Review is closed; Implementation Planning may proceed.
