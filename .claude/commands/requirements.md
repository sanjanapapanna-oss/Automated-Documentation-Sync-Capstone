---
description: 'Stage 1 — turn a user story into requirements.md via the requirements-analyst agent'
argument-hint: '[path to story file | Jira key | Confluence page | paste text]'
allowed-tools: Task, Read, Write, Grep, Glob, WebFetch
---

# /requirements

**Purpose**: Produce `requirements.md` from a new user story.

**Required input**: `$ARGUMENTS` — one of: a path to a local document (Word/Markdown/text), a
Jira issue key/URL, a Confluence page URL, or the story text pasted directly. If `$ARGUMENTS`
is empty, ask the user which of these they want to provide.

**Steps**:

1. Determine the source type from `$ARGUMENTS`. If it references Jira/Confluence, check for a
   configured MCP server first (see `mcp/README.md`); if unavailable, tell the user and ask
   them to paste the content or point to a local file instead.
2. Delegate to the `requirements-analyst` subagent (via `Task`) with the resolved source
   content.
3. If the agent reports open questions, relay them to the user and wait for answers before
   finalizing.
4. Present the resulting `requirements.md` for review.

**Expected output**: `requirements.md` under `output/<user-story-slug>/`, a new folder the
`requirements-analyst` agent creates by deriving a kebab-case slug from the story's title (see
`CLAUDE.md` §5 rule 6). This fixes the output folder for every later stage of this run.

**Validation rules**: every functional requirement must be testable; every acceptance
criterion must be concrete; no `OPEN QUESTION` markers may remain unresolved.

**Approval requirement**: do not commit `requirements.md`. Ask the user explicitly: "Do you
approve these requirements?" Only commit after an explicit yes, and only if the user also
authorizes the commit itself.
