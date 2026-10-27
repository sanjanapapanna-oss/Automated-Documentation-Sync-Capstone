# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Initial Agentic SDLC pipeline scaffolding: `CLAUDE.md`, nine `.claude/agents/*` subagents
  (orchestrator + eight stage specialists), eight `.claude/commands/*` slash commands, six
  `.claude/skills/*/SKILL.md` skills with templates, three `.claude/hooks/*` scripts
  (secret scanning, format-on-write, verification gate) wired via `.claude/settings.json`,
  and documented (unconfigured) MCP integration points for Jira, Confluence, and GitHub under
  `mcp/`.
- Project tooling: TypeScript, ESLint, Prettier, Vitest configuration.
- **Automated Technical Documentation Sync v1**: a CLI tool (`doc-sync`) that reads a master
  Markdown template and a local source repository, resolves every template field to a found
  value, `"Not Found"`, or `"Not Specified"` through a pluggable extractor (v1 ships one
  Node.js/TypeScript extractor), and renders a structurally-identical manifest via safe
  (temp-file-then-replace) output writing. Supports a human-readable CLI mode and a
  CI-hookable `--ci` JSON mode. 72 tests, 95.36% statement coverage.
- `requirements.md`, `architecture.md`, `design-review.md`, `impl-plan.md`,
  `code-review-report.md`, and `verification-report.md` documenting the full 8-stage delivery
  of the above, including one Critical bug (a Windows-only entry-point guard failure) found
  and fixed with a dedicated regression test, and two unused vulnerable dependencies removed.

### Fixed

- CLI entry-point "run directly" detection used a naive string comparison
  (`` `file://${process.argv[1]}` ``) that never matched on Windows, silently preventing
  `main()` from ever running when the compiled binary was invoked directly. Fixed with
  `node:url`'s `pathToFileURL`.
- The Node.js/TypeScript extractor only recognized `package.json`'s object-form `bin` field;
  the equally-valid npm string-form single-executable convention now resolves correctly for
  both "Entry Point" and "Exposed CLI Commands".

### Removed

- `gray-matter` and `zod` — declared as production dependencies but never imported anywhere;
  `gray-matter`'s transitive dependency chain carried a known moderate vulnerability for no
  benefit.
