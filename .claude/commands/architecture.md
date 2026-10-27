---
description: 'Stage 2 — produce architecture.md from an approved requirements.md via the architect agent'
argument-hint: '[optional: notes or constraints to consider]'
allowed-tools: Task, Read, Write, Grep, Glob
---

# /architecture

**Purpose**: Produce `architecture.md` from the approved `requirements.md`.

**Required input**: an approved `requirements.md` must exist under the current user story's
`output/<user-story-slug>/` folder (see `CLAUDE.md` §5 rule 6). Optional `$ARGUMENTS` for extra
constraints/notes the user wants considered.

**Steps**:

1. Confirm `requirements.md` exists and was approved (ask the user if unclear).
2. Delegate to the `architect` subagent with `requirements.md` and any `$ARGUMENTS` notes.
3. Review the agent's "Unresolved Decisions" list with the user before treating the design as
   final.

**Expected output**: `architecture.md` under `output/<user-story-slug>/`, including a Mermaid
component diagram and at least one data-flow diagram.

**Validation rules**: every component must map to a requirement; every external integration
must state its MCP-backed and fallback paths; unresolved decisions must be listed explicitly,
not silently decided.

**Approval requirement**: do not commit `architecture.md`, and do not proceed to
`/design-review` until the user has reviewed unresolved decisions.
