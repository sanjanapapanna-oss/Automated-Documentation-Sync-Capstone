# Code Review: Automated Technical Documentation Sync (v1)

Reviewed the Stage 5 implementation (13 tasks, `src/` + `tests/`) against `requirements.md`
and `architecture.md`. All 9 required areas below.

## 1. Correctness (vs. `requirements.md`)

Verified by mapping every FR/AC to a passing automated test (65/65) **and** by manually
running the compiled binary against real fixtures in all three modes (CLI, `--ci`, `--help`)
plus a real failure case — see Verification (Stage 7) for the exact commands and output.
No gaps found: FR-1 through FR-11 and AC-1 through AC-15 each have at least one test exercising
them (traceability is explicit in test names/comments, e.g. `// AC-10a`).

**Finding (Critical, found and fixed)**: the CLI's "run directly" entry-point guard
(`import.meta.url === \`file://${process.argv[1]}\``) never matches on Windows — the compiled
binary silently did nothing (exit 0, no output, no error) when actually run as `node
dist/cli/index.js ...`, despite every automated test passing, because the tests call `main()`directly and bypass this guard entirely. Found only by manually smoke-testing the real compiled
binary. **Fixed** using`node:url`'s `pathToFileURL` for a cross-platform-correct comparison;
re-verified by rerunning the binary against all three fixture repos (populated/empty/partial)
and a failure case, all producing correct output.

## 2. Security

- NFR-3 verified end-to-end: `--jira-api-token=<value>` and an arbitrary unrecognized flag are
  both rejected (fail-closed) without the value ever appearing in stderr or stdout — tested
  at the Config Loader unit level (`config.test.ts`) and the full CLI level (`cli.test.ts`).
- `--help`/`--version`/`-h`/`-V` are explicitly allowed (design-review Finding 1's fix) —
  verified the real binary's `--help` output renders correctly rather than being rejected.
- Grepped `src/` for `child_process`, `eval(`, `new Function(` — none found. No shell
  interpolation, no dynamic code execution anywhere.
- `loadDotEnvIfPresent` only ever returns a merged env map; nothing in the codebase logs or
  enumerates it wholesale — grepped for `console.log`/`process.stdout.write` call sites and
  confirmed none pass the raw env object.
- **Finding (High, found and fixed)**: `package.json` declared `gray-matter` and `zod` as
  production dependencies, but grepping `src/` and `tests/` found zero imports of either.
  `npm audit` showed `gray-matter`'s transitive `js-yaml`/`sprintf-js` chain carrying a known
  moderate DoS vulnerability — for a dependency that did nothing. **Fixed**: removed both from
  `package.json`, ran `npm install` to update the lockfile (18 → 14 vulnerabilities, all now in
  dev-only tooling — see Finding below), reran the full test suite to confirm no breakage.
  `architecture.md`'s Technology Stack table updated to match reality.
- **Finding (Medium, documented not fixed)**: the remaining 14 `npm audit` vulnerabilities are
  entirely in dev-only tooling (`eslint@8.57`'s plugin chain, and `vitest@1.6`'s `vite`/
  `esbuild`/`tinypool` chain, two of which are rated critical/high for `tinypool`'s prototype
  pollution). None are reachable from the shipped tool's own runtime code path — they only
  affect the local dev/lint/test toolchain, not `dist/cli/index.js` or anything it depends on.
  Fixing requires a major-version bump of `eslint` (8 → 9, which needs a flat-config rewrite of
  `.eslintrc.cjs`) and/or `vitest` (1 → 2/3), both out of scope for a Stage 6 code-review fix —
  recommending this as a tracked follow-up, not blocking this release. Documented here rather
  than silently accepted.

## 3. Error Handling

- FR-8(a) (template/repo/malformed) vs. FR-8(b) (empty/partial repo) are correctly
  distinguished at the `Orchestrator` level — verified by `orchestrator.test.ts`'s explicit
  assertions that empty/partial repos return `status: 'success'`, not `'failure'`.
- Per-field error containment (design-review Finding 2): `fieldResolver.test.ts` proves an
  exception thrown by one field's lookup resolves only that field to `"Not Found"`, leaving
  sibling fields unaffected.
- Safe output replacement (FR-10/AC-13): `safeWriter.test.ts` proves a persistently failing
  `rename` (simulating a locked destination) preserves the pre-existing valid file byte-for-
  byte and leaves no orphaned temp file, after exactly the documented 3 retry attempts.
- Top-level catch in `main()` confirmed to turn any unexpected error into a clean non-zero exit
  with a message, never a raw stack trace — exercised indirectly by the `ConfigError` path in
  `cli.test.ts`; the generic `catch` branch for a truly unexpected error has no dedicated test
  (acceptable: it's a last-resort safety net, not a code path with its own business logic to
  verify) but was manually sanity-checked by temporarily throwing an error during review.

## 4. Test Coverage

65 tests across 11 files (7 unit modules, the Node/TS extractor, presenters, plus 2 integration
suites). Every one of FR-8(a)'s three failure cases, FR-8(b)'s two evidence-absence cases, and
AC-15's mixed-field case are exercised with real fixtures (`populated-repo`, `empty-repo`,
`partial-repo`, `malformed-template.md`, `duplicate-field-template.md`) rather than mocks,
except where mocking the OS (`fs/promises.rename`) is the only way to simulate a locked file
deterministically. No gaps found against `impl-plan.md`'s task list — all 13 implementation
tasks have a corresponding test file.

## 5. Code Clarity

Naming matches `architecture.md`'s component names and signatures throughout (`resolveConfig`,
`parseTemplate`, `resolveFields`, `renderManifest`, `validateOutput`, `safeReplace`, `runSync`,
`presentHuman`/`presentCI`) — straightforward to cross-reference the design doc against the
code. The Node/TS extractor's `lookup()` is a single 17-case `switch`, which is long but each
case is simple, independent, and maps 1:1 to a template field — judged clearer as one visible
switch than split across 17 tiny functions for a mapping this direct.

## 6. DRY

No meaningful duplication found. The `matchAny()` helper in the Node/TS extractor is shared by
the Databases/Third-Party-Services/Messaging/Logging lookups rather than repeated four times.
The Orchestrator's three `try/catch` blocks (template, repo, replace) look structurally
parallel but each handles a distinct typed error (`TemplateError`/`RepoError`/
`ReplacementError`) — collapsing them into one generic error-mapping helper was considered and
rejected: it would save a few lines at the cost of an extra layer of indirection for marginal
benefit, which `CLAUDE.md`'s "no speculative abstractions" guidance argues against.

## 7. Dependency Safety

See Security (above) for the two findings (unused deps removed; remaining dev-tooling
vulnerabilities documented as a tracked follow-up, not blocking).

## 8. Architecture Compliance

Every one of `architecture.md`'s 11 components has a corresponding file at the exact path the
architecture document specifies (`src/core/config.ts`, `src/core/template/parser.ts`,
`src/core/extraction/extractor.ts`, `src/integrations/extractors/nodejs/`,
`src/core/resolution/fieldResolver.ts`, `src/core/render/renderer.ts`,
`src/core/validation/outputValidator.ts`, `src/core/io/safeWriter.ts`,
`src/core/orchestrator.ts`, `src/cli/presenters/`, `src/cli/index.ts`). One drift found and
corrected (see Security Finding above): `commander`'s actual role (help/version text only) was
narrower than the Technology Stack table's original wording implied — the table, not the code,
was wrong, and has been corrected to match the implementation, which independently matches the
Config Loader section's own (correct) narrative description.

## 9. Documentation Quality (generated output, not project docs)

Verified by direct inspection of real generated manifests (see Verification): template section
order and headings preserved exactly; every field resolves to a found value, `"Not Found"`, or
`"Not Specified"` with none blank; the "Owning Team" field correctly reads `"Not Specified"`
in all three fixture repos regardless of content, demonstrating AC-12's worked example.

## Summary

| #   | Severity | Area                                                | Status                                        |
| --- | -------- | --------------------------------------------------- | --------------------------------------------- |
| 1   | Critical | Correctness (Windows entry-point guard)             | **Fixed**                                     |
| 2   | High     | Security/Dependency safety (unused vulnerable deps) | **Fixed**                                     |
| 3   | Medium   | Dependency safety (dev-tooling vulnerabilities)     | **Documented, not fixed — tracked follow-up** |
| 4   | Low      | Architecture compliance (Tech Stack table drift)    | **Fixed**                                     |

No `Critical` finding was suppressed without a recorded decision — Finding 1 was fixed, not
suppressed. Finding 3 is an explicit, documented decision to defer (major version bumps to
dev-only tooling, zero runtime exposure), not a silently accepted risk.

**Gate status**: no unresolved `Critical` or `High` findings remain. Verification (Stage 7)
may proceed.
