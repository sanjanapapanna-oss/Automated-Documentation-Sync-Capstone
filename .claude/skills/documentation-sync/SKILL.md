---
name: documentation-sync
description: Use when implementing or modifying the core documentation-sync feature — parsing a master template, extracting verified facts from a source repository, resolving each field to a found value, "Not Found", or "Not Specified", preserving template structure, and validating the populated output.
---

# Documentation Sync

## When to Use

Stage 5 implementation of the primary business feature: `requirements-analyst` through
`verifier` all touch this when the task concerns template processing, source extraction, field
resolution, or output validation.

## Core Rules

1. **Preserve the master template exactly.** Structure, heading hierarchy, and field order
   must match the input template byte-for-byte except for populated values. Never reorder,
   rename, merge, or drop a template section.
2. **Never invent a value.** A field is populated only from evidence actually found in the
   source repository (code, config, README, package manifests, CI config, etc.) or the
   provided user story/context. If the pipeline cannot point to where a value came from, it
   does not populate it.
3. **Tri-state field resolution**:
   - **Found** — evidence located; populate the value and (internally) track its source
     reference for traceability.
   - **"Not Found"** — the field is in scope for this source type, the extractor looked, and
     found nothing.
   - **"Not Specified"** — the field does not apply to this project/source combination (e.g. a
     mobile-deployment field on a library with no deployment target), so searching for it is
     not meaningful.
     Never substitute one for the other to make output look more complete.
4. **Handle these inputs gracefully, every time**: missing template, malformed template
   (unparseable structure), missing/inaccessible source repository, empty repository, partial
   repository (some expected files missing), integration API errors. Each must produce a clear,
   specific error or a correctly marked "Not Found"/"Not Specified" — never a crash, never a
   silently wrong document.
5. **Traceability**: internally retain where each "Found" value came from (file path, or
   source system reference) so Code Review and output validation can check it against the
   actual repository rather than trusting the model's claim.

## Processing Pipeline (reference shape — adapt to the approved architecture.md)

1. Parse master template → ordered list of sections/fields.
2. Extract candidate facts from the source (repo files, manifests, config, docs; or
   Jira/Confluence/direct input for story-level facts).
3. Resolve each template field against extracted facts → Found / Not Found / Not Specified.
4. Render output preserving template order exactly.
5. Validate output (see checklist below) before reporting success.

## Output Validation Checklist

- [ ] All original template sections present, in original order.
- [ ] No field left blank — every field is a value, "Not Found", or "Not Specified".
- [ ] No value present that isn't traceable to actual source evidence.
- [ ] Document renders as valid Markdown (or the template's actual format).

## Fixtures

Use/extend `tests/fixtures/` for: happy-path repo, empty repo, missing files, malformed
template, simulated API failure. Don't invent one-off ad hoc cases outside fixtures.
