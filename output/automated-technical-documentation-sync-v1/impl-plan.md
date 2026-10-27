# Implementation Plan: Automated Technical Documentation Sync (v1)

Derived from the approved `requirements.md` (v4) and `architecture.md` (v2, design review
findings resolved). No task below is `BLOCKED` — all three prior stages are complete with zero
unresolved blockers.

## Task List

### Task 1: Shared core types

- **Status**: `TODO`
- **Depends on**: None
- **Affected files**: `src/core/types.ts`
- **Acceptance criteria**: `ParsedTemplate`/`TemplateLine`, `FieldResult`, `Extractor`,
  `ResolvedManifest`, `RunResult`, `ValidationResult`, and the error types (`TemplateError`,
  `RepoError`, `ConfigError`, `ReplacementError`) are defined and exported.
- **Verification command**: `npm run typecheck`
- **Touches security boundary / external integration / destructive operation?**: No

### Task 2: Test fixtures

- **Status**: `TODO`
- **Depends on**: None
- **Affected files**: `tests/fixtures/master-template.md`, `tests/fixtures/malformed-template.md`,
  `tests/fixtures/populated-repo/**`, `tests/fixtures/empty-repo/.gitkeep`,
  `tests/fixtures/partial-repo/**`
- **Acceptance criteria**: fixtures exist for AC-1 (populated), AC-2 (empty), AC-5 (malformed
  template), AC-15 (partial repo); populated-repo fixture includes `package.json`,
  `tsconfig.json`, `README.md`, `Dockerfile`, and a `.github/workflows/ci.yml`.
- **Verification command**: `ls tests/fixtures` (existence check; content validated by the
  tests that consume them)
- **Touches security boundary / external integration / destructive operation?**: No

### Task 3: Template Parser

- **Status**: `TODO`
- **Depends on**: Task 1
- **Affected files**: `src/core/template/parser.ts`, `tests/unit/templateParser.test.ts`
- **Acceptance criteria**: FR-2 (order/structure preserved), FR-8(a) (`TEMPLATE_NOT_FOUND` /
  `TEMPLATE_MALFORMED` with location)
- **Verification command**: `npx vitest run tests/unit/templateParser.test.ts`
- **Touches security boundary / external integration / destructive operation?**: No

### Task 4: Extractor Interface & Registry

- **Status**: `TODO`
- **Depends on**: Task 1
- **Affected files**: `src/core/extraction/extractor.ts`, `tests/unit/extractorRegistry.test.ts`
- **Acceptance criteria**: AC-9 (adding a stub second extractor requires no core changes)
- **Verification command**: `npx vitest run tests/unit/extractorRegistry.test.ts`
- **Touches security boundary / external integration / destructive operation?**: No

### Task 5: Output Renderer

- **Status**: `TODO`
- **Depends on**: Task 1
- **Affected files**: `src/core/render/renderer.ts`, `tests/unit/renderer.test.ts`
- **Acceptance criteria**: FR-5 (exact structure preservation), NFR-2 (determinism)
- **Verification command**: `npx vitest run tests/unit/renderer.test.ts`
- **Touches security boundary / external integration / destructive operation?**: No

### Task 6: Output Validator

- **Status**: `TODO`
- **Depends on**: Task 1
- **Affected files**: `src/core/validation/outputValidator.ts`, `tests/unit/outputValidator.test.ts`
- **Acceptance criteria**: AC-6 (evidence-pointer presence), AC-11 (no blank/null fields)
- **Verification command**: `npx vitest run tests/unit/outputValidator.test.ts`
- **Touches security boundary / external integration / destructive operation?**: No

### Task 7: Safe Output Writer

- **Status**: `TODO`
- **Depends on**: Task 1
- **Affected files**: `src/core/io/safeWriter.ts`, `tests/unit/safeWriter.test.ts`
- **Acceptance criteria**: FR-10, AC-13 (existing file preserved on failure, temp cleaned up,
  bounded retry on lock)
- **Verification command**: `npx vitest run tests/unit/safeWriter.test.ts`
- **Touches security boundary / external integration / destructive operation?**: Writes/deletes
  temp files under the test's own tmp directory only — no risk to real project files

### Task 8: Config Loader

- **Status**: `TODO`
- **Depends on**: Task 1
- **Affected files**: `src/core/config.ts`, `tests/unit/config.test.ts`
- **Acceptance criteria**: FR-1, FR-9, NFR-3, AC-10 (ordinary args work; secret-shaped/
  unrecognized flags rejected without echoing value; `--help`/`--version` explicitly allowed
  per design-review Finding 1 fix)
- **Verification command**: `npx vitest run tests/unit/config.test.ts`
- **Touches security boundary / external integration / destructive operation?**: Yes —
  security boundary (NFR-3 enforcement)

### Task 9: Field Resolver

- **Status**: `TODO`
- **Depends on**: Task 1, Task 4
- **Affected files**: `src/core/resolution/fieldResolver.ts`, `tests/unit/fieldResolver.test.ts`
- **Acceptance criteria**: FR-4, Field Resolution Rule safeguard, AC-12 ("Owning Team" worked
  example), per-field error containment (design-review Finding 2 fix)
- **Verification command**: `npx vitest run tests/unit/fieldResolver.test.ts`
- **Touches security boundary / external integration / destructive operation?**: No

### Task 10: Node.js/TypeScript Extractor

- **Status**: `TODO`
- **Depends on**: Task 2, Task 4
- **Affected files**: `src/integrations/extractors/nodejs/index.ts`,
  `tests/unit/nodeExtractor.test.ts`
- **Acceptance criteria**: FR-3 (evidence-file list), AC-12 ("Owning Team" → always "Not
  Specified"), AC-15 (partial repo → mixed found/"Not Found"), deterministic multi-candidate
  tie-break (design-review Finding 4 fix)
- **Verification command**: `npx vitest run tests/unit/nodeExtractor.test.ts`
- **Touches security boundary / external integration / destructive operation?**: No (read-only
  against fixture repos)

### Task 11: Sync Orchestrator

- **Status**: `TODO`
- **Depends on**: Task 3, Task 5, Task 6, Task 7, Task 9, Task 10
- **Affected files**: `src/core/orchestrator.ts`, `tests/integration/orchestrator.test.ts`
- **Acceptance criteria**: FR-6 (idempotent full regenerate), FR-8(a)/(b) (failure vs.
  evidence-absence classification), FR-10 (safe replacement sequencing), AC-1, AC-2, AC-3,
  AC-4, AC-5, AC-7, AC-15
- **Verification command**: `npx vitest run tests/integration/orchestrator.test.ts`
- **Touches security boundary / external integration / destructive operation?**: No

### Task 12: Presenters (Human + CI)

- **Status**: `TODO`
- **Depends on**: Task 1
- **Affected files**: `src/cli/presenters/humanPresenter.ts`,
  `src/cli/presenters/ciPresenter.ts`, `tests/unit/presenters.test.ts`
- **Acceptance criteria**: FR-7, FR-11 (minimum JSON schema), AC-14 (schema conformance)
- **Verification command**: `npx vitest run tests/unit/presenters.test.ts`
- **Touches security boundary / external integration / destructive operation?**: No

### Task 13: CLI Entry Point

- **Status**: `TODO`
- **Depends on**: Task 8, Task 11, Task 12
- **Affected files**: `src/cli/index.ts`, `tests/integration/cli.test.ts`
- **Acceptance criteria**: AC-8 (exit codes), AC-10 (end-to-end secret rejection), full
  end-to-end wiring of every FR/AC above
- **Verification command**: `npx vitest run tests/integration/cli.test.ts`
- **Touches security boundary / external integration / destructive operation?**: Yes —
  security boundary (final NFR-3 enforcement point before any I/O)

### Task 14: Full verification pass

- **Status**: `TODO`
- **Depends on**: Tasks 1–13
- **Affected files**: none (verification only)
- **Acceptance criteria**: all of the above, run together; this task's output feeds Stage 7's
  `verification-report.md`
- **Verification command**: `npm run verify` (typecheck + lint + format:check + test)
- **Touches security boundary / external integration / destructive operation?**: No

## Dependency Order

1 → 2 (parallel) → {3, 4, 5, 6, 7, 8} (all depend only on 1) → 9 (needs 4) → 10 (needs 2, 4) →
11 (needs 3, 5, 6, 7, 9, 10) → 12 (needs 1) → 13 (needs 8, 11, 12) → 14 (needs all)

## Blocked Tasks

None.
