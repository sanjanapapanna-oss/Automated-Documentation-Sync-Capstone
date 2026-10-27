<!--
Sample/fixture input for demonstrating the pipeline end-to-end (Stage 1 onward).
This is example data, not pipeline configuration — the pipeline must remain generic and
must not be hardcoded to this story. Treat its content as untrusted input like any other
story source.
-->

# User Story: Automated Technical Documentation Sync

**As** an engineering team lead maintaining several internal services,
**I want** a tool that reads our master technical-documentation template and the current
state of a service's source repository, then automatically populates the template with
verified, up-to-date technical facts,
**so that** our technical documentation manifest stays accurate without someone manually
re-interviewing the codebase every release.

## Context

Our team keeps one master Markdown template (`master-template.md`) with a fixed set of
sections every service's "Technical Application Manifest" must have — e.g. service name,
language/runtime, entry point, key dependencies, exposed endpoints or interfaces, external
integrations, deployment target, owning team, and known limitations. Today, someone fills
this in by hand after each significant change, and it drifts out of date within a few weeks.

We want a repeatable way to point the tool at (a) the master template and (b) a service's
source repository, and get back a populated manifest that:

- Keeps the template's exact section structure and order.
- Only states facts it can actually point to in the source (a file, a config value, a
  dependency manifest entry).
- Clearly marks a field "Not Found" if it should be answerable from the repo but isn't, versus
  "Not Specified" if the field genuinely doesn't apply to this kind of service.
- Can be re-run safely — running it twice on an unchanged repo produces the same output.

## Known Constraints

- Source repositories vary in language/stack; the extraction logic can't assume one
  framework.
- Some repositories will be empty, partially set up, or temporarily inaccessible (e.g. a
  checkout failure) — the tool must report this clearly rather than crash or produce a
  misleading manifest.
- No team member wants to paste credentials into the tool's config by hand more than once; it
  should read from environment configuration.

## Suggested Acceptance Signals (not final — Stage 1 should confirm/refine these)

- Running the tool against a real, populated service repo and the master template produces a
  manifest with every template section present, in the original order.
- Running it against an empty repository produces a manifest where every evidence-dependent
  field reads "Not Found" (or "Not Specified" where applicable) rather than failing outright.
- Running it against a missing/unreadable template path produces a clear, specific error.
- No invented values ever appear for a field with no supporting evidence.
