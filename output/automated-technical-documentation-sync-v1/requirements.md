# Requirements: Automated Technical Documentation Sync (v1)

## Source

- **Origin**: `examples/sample-user-story.md` (direct-input fixture, treated as untrusted
  story content)
- **Date captured**: 2026-10-14
- **Clarifications resolved with human on**: 2026-10-14 (source access, stack coverage,
  output-overwrite behavior, invocation model — see "Confirmed via Human Clarification" under
  Assumptions)
- **Expanded per structured gap review on**: 2026-10-14 — see Revision History at the end of
  this document for what changed and why.

## Summary

Build a CLI tool that reads a master technical-documentation template and a local source
repository, extracts verified technical facts via a pluggable per-stack extractor framework
(v1 ships a Node.js/TypeScript extractor), and populates a Technical Application Manifest that
preserves the template's exact structure, never invents values, and distinguishes "Not Found"
from "Not Specified." Supports manual CLI use and a CI-hookable non-interactive mode with a
defined JSON contract. A failed run never corrupts or discards an existing valid manifest.

## Functional Requirements

1. **FR-1**: Accept a path to a master documentation template (Markdown) and a path to a
   local source repository as input (via CLI args and/or environment configuration).
2. **FR-2**: Parse the master template into an ordered list of sections and fields, preserving
   heading hierarchy and field order exactly.
3. **FR-3**: Extract technical facts from the source repository through a pluggable extractor
   interface. v1 ships one concrete extractor for Node.js/TypeScript projects, reading evidence
   from `package.json`, `tsconfig.json`, `README.md`, `Dockerfile`, and common CI config files
   (e.g. `.github/workflows/*.yml`) where present. _(This specific evidence-file list is an
   assumption, not literal story text — see Assumptions.)_
4. **FR-4**: For every template field, resolve exactly one of: a value with traceable evidence
   (file/config entry it came from), `"Not Found"`, or `"Not Specified"` — see "Field
   Resolution Rule" below for the exact rule and a worked example.
5. **FR-5**: Render output preserving the master template's exact section order and structure —
   only field values are populated or marked; headings/structure are never altered.
6. **FR-6**: Re-running the tool against unchanged template and repository inputs produces
   byte-identical output. Each successful run fully regenerates the manifest; the output file
   at the configured path is only ever replaced after the newly generated manifest has been
   produced and validated in full (no partial-merge behavior) — see **FR-10** for the
   failure-safety guarantee this implies.
7. **FR-7**: Support two invocation modes: (a) manual CLI, human-readable Markdown output and
   console summary; (b) CI-hookable non-interactive mode producing a machine-readable (JSON)
   run summary (schema defined in **FR-11**) and a process exit code reflecting tool-level
   success/failure.
8. **FR-8**: Handle the following cases without ever crashing or producing misleading output:
   (a) **Tool-level failures** — a clear, specific error (CLI mode) or JSON error summary (CI
   mode), process exits non-zero: missing/unreadable template path, missing/inaccessible
   source repository path, malformed/unparseable template. _(The malformed/unparseable-
   template case is an assumption, not literal story text — see Assumptions.)_ Every case in
   FR-8(a) is also subject to **FR-10**: none of them may alter or remove an existing valid
   output file.
   (b) **Evidence-absence cases — not failures** — a normal successful run, exit 0: empty
   repository, and partial repository (expected files missing). Every evidence-dependent field
   affected by the missing evidence resolves to `"Not Found"` per FR-4, and the run completes
   and replaces the output file normally per FR-6/FR-10.
9. **FR-9**: Read all configuration (template path, source repository path, output path) from
   environment variables (see `.env.example`) rather than requiring re-entry on every run.
10. **FR-10 (Safe output replacement)**: Generation writes the new manifest to a temporary
    file first and validates that temporary output (template-structure preservation per FR-5,
    complete field resolution per FR-4) before touching the configured output path.
    Replacement of any existing output file then uses the safest replacement operation
    available on the current platform and filesystem (e.g. a same-directory rename/move, which
    is atomic on most POSIX filesystems and on Windows when source and destination share a
    volume) — but this requirement does **not** promise filesystem-level atomicity on every
    platform, filesystem, or configuration (e.g. a cross-volume output path, a network
    filesystem, or a destination file held open by another process on Windows). Regardless of
    whether the platform can guarantee atomic replacement, the implementation must guarantee:
    (a) if the replacement step itself fails or is interrupted, any pre-existing valid manifest
    at the output path is left unchanged — never partially overwritten, truncated, or
    corrupted — and the failure is reported as a tool-level failure (non-zero exit, specific
    error), not swallowed; and (b) the temporary file is always cleaned up (deleted) after the
    run, whether generation, validation, or replacement is what failed — no orphaned temporary
    file is left behind on any supported platform (at minimum Windows and POSIX systems,
    matching this project's Node.js/TypeScript runtime target). If generation or validation
    fails for any reason — including every case in FR-8(a)'s failure list — the temporary file is
    discarded before the replacement step is ever attempted, and the existing output file (if
    any) is untouched.
11. **FR-11 (CI JSON summary schema)**: The CI-hookable mode's machine-readable summary (FR-7b)
    is a JSON object with, at minimum:
    - **On success**: `status` (`"success"`), a found-field count, an unresolved-field count
      (fields resolved to `"Not Found"` or `"Not Specified"`, combined), and the output path.
    - **On failure**: `status` (`"failure"`), a stable `errorCode` identifying the failure
      category (e.g. `TEMPLATE_NOT_FOUND`, `REPO_NOT_FOUND`, `TEMPLATE_MALFORMED`), and an
      actionable `errorMessage`.
      No other field is required to have a fixed shape in v1; additional diagnostic fields may be
      added without being considered a breaking change as long as the fields above remain present.

## Field Resolution Rule: "Not Found" vs. "Not Specified"

**Rule**: resolution is determined per-extractor, per-field:

- If the active extractor defines a lookup rule for a field but that rule finds no matching
  evidence in the source repository, the field resolves to **"Not Found."**
- If the active extractor defines **no** lookup rule at all for a field — because the field
  describes something source code structurally cannot evidence — the field resolves to
  **"Not Specified,"** regardless of repository content.

**Safeguard against misuse**: "Not Specified" is only valid for a field the extractor
_intentionally and structurally_ cannot evidence — it must never be used as a shortcut to skip
checking an evidence source the extractor is reasonably expected to examine. Each extractor's
set of "Not Specified" fields must be **fixed and documented** at implementation time (in code
and/or `architecture.md`), not decided dynamically per run based on what evidence happens to be
present. If an extractor is expected (per FR-3's evidence-file list, or any additional sources
documented for it in `architecture.md`) to check a given source for a field and simply doesn't
check it, or checks it and finds nothing, that field must resolve to **"Not Found,"** never
"Not Specified" — "Not Specified" is reserved for fields with no applicable evidence source at
all, by design.

**Worked example for the v1 Node.js/TypeScript extractor**: the master template's **"Owning
Team"** field asks an organizational/people question that no code artifact (`package.json`,
`tsconfig.json`, `README.md`, `Dockerfile`, CI config) reliably or structurally answers. The v1
extractor therefore defines no lookup rule for "Owning Team" at all, so it must resolve to
**"Not Specified"** on every run, regardless of whether the repository is populated or empty —
in contrast to a field like "Databases," for which the extractor _does_ define a rule (scanning
dependency manifests for known database client/driver packages) and which can legitimately
resolve to either a found value or **"Not Found"** depending on what's actually in the repo.

This distinction is exercised by **AC-12** using the existing populated-repository and
empty-repository fixtures already required for AC-1/AC-2 — no fabricated or invented evidence
is needed, since "Owning Team" resolves to "Not Specified" as a property of the extractor's
rule coverage, not of repository content. The v1 extractor's fixed "Not Specified" field set
(here, just "Owning Team") must be documented in its implementation or `architecture.md` and is
checked at Stage 6 Code Review against the safeguard above.

## Non-Functional Requirements

1. **NFR-1 Reliability**: the tool must never crash (uncaught exception) on any input in
   FR-8(a)'s failure list, nor if the FR-10 output-replacement step itself fails (e.g. a locked
   destination file) — in every case it must exit non-zero with a specific message instead.
2. **NFR-2 Determinism**: identical inputs produce byte-identical output across repeated runs
   (same machine, same tool version).
3. **NFR-3 Security**: secret/credential values (e.g. Jira/Confluence API tokens, GitHub
   tokens) are never written to output files, logs, or the CI JSON summary, and are never
   accepted as CLI configuration — only via environment variables. This restriction applies
   only to secret-shaped values, not to CLI arguments in general: ordinary (non-secret)
   configuration — template path, source repository path, output path, and output-mode flags —
   remains freely accepted via CLI arguments per **FR-1**/**FR-9**. The tool identifies and
   rejects secret-shaped CLI input by (a) refusing any flag whose name matches a documented
   secret-indicating pattern (e.g. containing `token`, `secret`, `key`, `password`,
   `credential`, case-insensitive) and (b) failing closed — refusing to start — on any CLI flag
   not in its documented allow-list of accepted configuration flags, so an unrecognized flag
   name can't become an undetected channel for a secret. In both cases, the rejection error
   names only the offending flag; it never includes the flag's value, in either the error
   message or any log output. **This NFR requires the tool to implement this rejection logic
   itself** — it is not satisfied by, or a consequence of, the project's own
   `.claude/hooks/check-secrets.js` pre-tool-use hook, which only guards against secrets being
   written into _this repository's own source_ during development and has no effect on the
   shipped tool's runtime behavior; see Out of Scope for the exact boundary of what
   secret-handling logic v1 must implement.
4. **NFR-4 Extensibility**: adding a new stack's extractor requires only a new implementation
   of the extractor interface — no changes to template-parsing, field-resolution, or
   output-rendering core modules.
5. **NFR-5 Performance (provisional, non-binding)**: a typical service repository (low
   thousands of files) is expected to complete extraction and output rendering in well under a
   minute on a developer machine. **This is a provisional target, not a verifiable acceptance
   criterion** — the source story gives no explicit performance requirement, and no
   representative repository sizes or real measurements exist yet. It must be revisited (and
   either confirmed with concrete numbers or formally dropped) once Verification has real data
   to measure against; until then it must not be treated as a pass/fail gate.

## Assumptions

### Confirmed via Human Clarification (2026-10-14, round 1)

These were explicit scope decisions made by the human in response to direct clarifying
questions — they are settled, not open:

- **Source repository access (v1)**: local filesystem path only. No network access or
  authentication is required or supported for v1 extraction (remote clone / Git-hosting API
  access is a documented future integration — see Out of Scope).
- **Stack coverage (v1)**: a pluggable extractor framework, with exactly one concrete
  implementation shipped in v1 (Node.js/TypeScript). No other stack extractor is implemented
  now.
- **Output behavior**: each successful run fully regenerates and replaces the manifest (no
  partial-merge of manual edits) — refined by FR-10 so that this replacement happens only after
  successful validation, never on a failed run.
- **Invocation model**: both manual CLI and a CI-hookable non-interactive mode are in scope for
  v1 (not CLI-only).

### Confirmed via Human Refinement (2026-10-14, round 2)

These were explicit corrections directed by the human after reviewing v2 of this document —
also settled, not open:

- **Secret-shaped CLI arguments**: ordinary CLI arguments for template/repository/output paths
  remain fully permitted (FR-1/FR-9 are unaffected); only secret-shaped values are restricted
  to environment variables. Secret-shaped flags are identified by name pattern and by failing
  closed on any undocumented flag; rejections never echo the value (NFR-3, AC-10).
- **"Not Specified" cannot bypass expected evidence checks**: an extractor's "Not Specified"
  field set must be fixed, documented, and decided at design time — never used dynamically to
  skip an evidence source the extractor is otherwise expected to examine (see "Field
  Resolution Rule," AC-12).
- **Output replacement is "safe," not promised atomic**: FR-10/AC-13 require preserving the
  existing valid manifest and cleaning up temporary files on any failure, across this
  project's target platforms (Windows and POSIX) — without claiming filesystem-level atomicity
  the chosen implementation/filesystem may not actually provide.

### Not Yet Confirmed — Flagged for Architecture/Human Review

These are reasonable extensions I made beyond the literal text of
`examples/sample-user-story.md` and the clarification rounds above. They are **not** confirmed
requirements and should be revisited at the Architecture stage:

- The specific evidence-file list for the Node.js/TypeScript extractor (FR-3: `package.json`,
  `tsconfig.json`, `README.md`, `Dockerfile`, CI workflow files) — the story only states that
  extraction logic "can't assume one framework"; it does not specify which files a Node/TS
  extractor should actually read.
- Treating a malformed/unparseable template as its own distinct, explicitly handled error case
  (FR-8(a), AC-5) — the story's own "Suggested Acceptance Signals" mention a missing/unreadable
  template _path_, not malformed template _content_ as a separate case.
- The specific choice of "Owning Team" as the v1 extractor's example "Not Specified" field —
  the general safeguard policy around "Not Specified" is now human-confirmed (above), but this
  particular field choice is still an implementation-level pick to double-check at Architecture.
- The master template's field/section shape (headings = sections, list items = fields,
  matching `examples/master-template.md`) is inferred from the fixture, not stated generically
  in the story — a differently structured template may need the parser (FR-2) revisited.

## Dependencies

- Node.js ≥ 20 runtime (already established in `package.json`).
- Both the master template and the source repository must be present and readable on the local
  filesystem at run time.
- Target platforms: Windows (this project's current development/runtime environment) and
  POSIX-compatible systems, via Node.js's cross-platform runtime — see FR-10 for the
  platform-specific implications for safe output replacement.

## Constraints

- Must preserve the master template's section/field order exactly — no reordering, renaming,
  merging, or dropping sections.
- Must never populate a field with a value that isn't traceable to specific source evidence.
- Must always distinguish "Not Found" from "Not Specified" — never used interchangeably.
- Secret/credential configuration must come only from the environment — never required to be
  re-entered by hand or passed as a CLI argument (see NFR-3); this does not restrict ordinary
  CLI arguments for non-secret configuration (template/repository/output paths, per FR-1/FR-9).
- Must never replace a valid existing output file with a failed, partial, or invalid run's
  output (FR-10).
- **SDLC traceability**: delivery of this feature follows the project's gated eight-stage
  workflow defined in `CLAUDE.md` (Requirements → Architecture → Design Review → Implementation
  Planning → Implementation → Code Review → Verification → PR Preparation). This document is
  not committed, and no later stage proceeds past an unresolved blocker, without explicit human
  approval at each gate.

## Acceptance Criteria

- [ ] **AC-1**: Given a populated Node.js/TypeScript sample repository and the master template,
      the tool produces an output manifest containing every section from the master template,
      in the original order.
- [ ] **AC-2**: Given an empty repository, every evidence-dependent field in the output
      resolves to "Not Found" (or "Not Specified" if inapplicable to the extractor); the tool
      exits 0 (a successful run that found no evidence is not a tool failure) and its summary
      states how many fields were unresolved.
- [ ] **AC-3**: Given a missing or unreadable template path, the tool exits non-zero with a
      specific, actionable error naming the path and the problem, and does not touch any
      existing output file (see AC-13).
- [ ] **AC-4**: Given a missing or inaccessible source repository path, the tool exits non-zero
      with a specific error, distinguishable from the template-path error, and does not touch
      any existing output file (see AC-13).
- [ ] **AC-5**: Given a malformed/unparseable template, the tool exits non-zero with a specific
      parse error identifying the problem location, and does not touch any existing output file
      (see AC-13).
- [ ] **AC-6**: No field in any produced output contains a value that cannot be traced to a
      specific file or config entry in the source repository.
- [ ] **AC-7**: Running the tool twice in a row against unchanged inputs produces
      byte-identical output files.
- [ ] **AC-8**: CI-hookable invocation produces a machine-readable JSON run summary conforming
      to the schema in FR-11 (verified by AC-14) and sets process exit code 0 on a successful
      tool-level run, non-zero on tool-level failure (per FR-8(a)'s failure list) — "Not Found"/
      "Not Specified" fields alone do not trigger a non-zero exit.
- [ ] **AC-9**: Adding a second stack extractor (even a minimal/stub one, for testing the
      interface) requires no changes to template-parsing, field-resolution, or
      output-rendering core modules — verifiable by code review against the approved
      architecture.
- [ ] **AC-10 (Secret handling)**:
      (a) Given ordinary CLI arguments for the template path, repository path, and output path
      (per FR-1/FR-9), the tool accepts and uses them normally — this criterion restricts only
      secret-shaped CLI input, never general CLI configuration.
      (b) Given a CLI invocation that passes a secret-shaped flag (e.g.
      `--jira-api-token=<value>`), the tool rejects the invocation and exits non-zero before
      any extraction occurs; the resulting error message and any logs name the rejected flag
      but never contain its value.
      (c) Given a CLI invocation that passes an undocumented/unrecognized flag carrying a
      value, the tool fails closed (rejects the invocation) rather than silently accepting it,
      and the rejection likewise never echoes the value.
      (d) Given a `.env` populated with placeholder-shaped secret values (e.g. a dummy
      `JIRA_API_TOKEN`), after a successful run in both CLI and CI modes against any fixture,
      no generated manifest file, CI JSON summary, or console/log output contains that secret
      value in plaintext.
- [ ] **AC-11 (Output completeness)**: Given any successful run (populated or empty
      repository), every field defined by the master template resolves to exactly one of: a
      verified value, "Not Found," or "Not Specified" — no field is left blank, null, or
      omitted from the rendered output.
- [ ] **AC-12 (Not Specified worked example)**: Given either the populated sample repository
      (AC-1's fixture) or the empty repository (AC-2's fixture), the "Owning Team" field — for
      which the v1 Node.js/TypeScript extractor defines no lookup rule — resolves to "Not
      Specified" in both cases, demonstrating the "Not Found" vs. "Not Specified" distinction
      using only the existing controlled fixtures (no fabricated evidence required).
- [ ] **AC-13 (Safe output replacement)**:
      (a) Given an existing valid manifest at the configured output path, if a subsequent run
      fails for any reason in FR-8(a)'s failure list, the pre-existing manifest file remains
      byte-for-byte unchanged after the failed run, and no partially written file or orphaned
      temporary file is left anywhere under the output path's directory — verified on this
      project's primary target platform (Windows), and on POSIX where feasible.
      (b) Given an existing valid manifest at the configured output path, if the replacement
      step itself cannot complete (e.g. the destination file is locked/held open by another
      process), the tool reports this as a tool-level failure (non-zero exit, specific error),
      the pre-existing manifest remains unchanged, and the temporary file is cleaned up rather
      than left behind.
      (c) This criterion tests only the two outcomes FR-10 actually commits to — existing-file
      preservation and temporary-file cleanup — not filesystem-level atomicity, which FR-10
      does not universally promise.
- [ ] **AC-14 (CI JSON schema conformance)**: Given a successful CI-mode run, the JSON summary
      contains at least `status: "success"`, a found-field count, an unresolved-field count,
      and the output path. Given a failed CI-mode run, the JSON summary contains at least
      `status: "failure"`, a stable `errorCode`, and an actionable `errorMessage`. Both shapes
      are validated against the minimal schema defined in FR-11.
- [ ] **AC-15 (Partial repository)**: Given a source repository that contains some, but not
      all, of the Node.js/TypeScript extractor's expected evidence files (e.g. a `package.json`
      present but no `Dockerfile` or CI config), the resulting output contains a mix of found
      values and `"Not Found"` fields in the same run — fields with available evidence resolve
      normally, fields the extractor is in scope for but finds no evidence for resolve to
      `"Not Found"` — and the tool exits 0, consistent with FR-8(b). This is distinct from
      AC-12: AC-12 tests a field with no lookup rule at all ("Not Specified"); AC-15 tests
      fields with a lookup rule but partial evidence ("Not Found" alongside found values).

## Out of Scope (v1)

- Remote repository cloning or Git-hosting API access (local filesystem path only for v1;
  documented as a future integration point).
- Extractors for stacks other than Node.js/TypeScript (framework supports adding them later;
  none are shipped in v1).
- Merge/preserve-manual-edits behavior on re-run (full overwrite-after-validation only, per
  FR-6/FR-10).
- Authoring or wiring an actual CI pipeline/workflow (only the tool's own CI-hookable mode is
  in scope).
- Master template authored in a non-Markdown format (Word, Confluence) for v1.
- A dedicated secret-scanning or redaction engine that inspects arbitrary content for
  credential-shaped patterns (e.g. entropy analysis, or scanning _extracted repository content_
  itself for leaked secrets) is out of scope for v1. What **is** in scope, and must be
  implemented by the tool itself: rejecting secret-shaped CLI flags by name and failing closed
  on unrecognized flags (NFR-3), and never writing environment-sourced secret values into
  generated output (AC-10). The project's own `.claude/hooks/check-secrets.js` is a
  development-time safeguard for this repository's own SDLC process — it scans content Claude
  writes during implementation — and has no bearing on, and does not substitute for, the
  shipped tool's own runtime secret-handling logic required by NFR-3/AC-10.

## Revision History

- **v1 (2026-10-14)**: Initial draft from `examples/sample-user-story.md`, after resolving four
  clarifying questions (source access, stack coverage, output-overwrite behavior, invocation
  model).
- **v2 (2026-10-14)**: Incorporated structured gap review. Added FR-10 (failure-safe output
  replacement) and FR-11 (CI JSON summary schema); added a dedicated "Field Resolution Rule"
  section with a worked "Owning Team" example; added AC-10 through AC-14 (secret handling,
  output completeness, Not-Specified worked example, failure-safety, CI schema conformance);
  restructured Assumptions into "Confirmed via Human Clarification" vs. "Not Yet Confirmed";
  softened NFR-5 to a provisional/non-binding target; added an SDLC-traceability constraint;
  added an Out-of-Scope bullet explicitly limiting secret-handling scope.
- **v3 (2026-10-14)**: Incorporated three human-directed final refinements. NFR-3/AC-10
  rewritten so ordinary CLI arguments (template/repo/output paths) remain explicitly permitted
  while only secret-shaped CLI input is restricted, with a concrete identify-and-reject policy
  that never echoes rejected values; clarified `check-secrets.js` is a development-time
  safeguard only, not a runtime guarantee for the shipped tool. Added a "Safeguard against
  misuse" paragraph to the Field Resolution Rule so "Not Specified" can't bypass evidence an
  extractor is expected to check, and requires each extractor's "Not Specified" field set to be
  fixed and documented. FR-10/AC-13 reworded from "atomic rename/move" to "safe replacement,"
  explicitly covering Windows and POSIX, requiring existing-manifest preservation and
  temporary-file cleanup without over-promising filesystem-level atomicity; NFR-1 extended to
  cover replacement-step failures; the Out-of-Scope secret-handling bullet, the Constraints
  secret-configuration bullet, and Assumptions restructured to match (added a "Confirmed via
  Human Refinement (round 2)" subsection).
- **v4 (2026-10-14)**: Fixed a contradiction found during a dedicated re-verification pass:
  FR-8 previously lumped empty/partial repositories in with true tool-level failures (implying
  non-zero exit), directly contradicting AC-2 and the source story's own "rather than failing
  outright" acceptance signal for empty repositories. Split FR-8 into FR-8(a) (true failures:
  bad template/repo path, malformed template) and FR-8(b) (evidence-absence cases — empty and
  partial repository — which are normal successful runs, exit 0, fields resolve to "Not
  Found"). Retargeted NFR-1, AC-8, and FR-10's "FR-8's failure list" cross-references to
  FR-8(a) specifically. Added **AC-15** to explicitly test the partial-repository mixed
  found/"Not Found" case, distinguishing it from AC-12's "Not Specified" case.
