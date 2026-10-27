import { Extractor, ParsedTemplate, ResolvedField, ResolvedManifest } from '../types.js';

/**
 * "Not Specified" is decided here, structurally, by consulting the
 * extractor's static notSpecifiedFields set - never by asking the extractor
 * at call time - so it can never be used as a dynamic shortcut to skip an
 * evidence check (the Field Resolution Rule safeguard in requirements.md).
 *
 * Each field's lookup runs inside its own catch boundary: an unexpected
 * error reading one evidence file degrades only that field to "Not Found",
 * never the whole run (design-review Finding 2).
 */
export function resolveFields(
  template: ParsedTemplate,
  extractor: Extractor,
  repoPath: string,
): ResolvedManifest {
  const fields = new Map<string, ResolvedField>();
  let foundCount = 0;
  let unresolvedCount = 0;

  for (const label of template.fieldLabels) {
    let resolved: ResolvedField;

    if (extractor.notSpecifiedFields.has(label)) {
      resolved = { status: 'not-specified' };
    } else {
      try {
        resolved = extractor.lookup(label, repoPath);
      } catch {
        resolved = { status: 'not-found' };
      }
    }

    fields.set(label, resolved);
    if (resolved.status === 'found') {
      foundCount += 1;
    } else {
      unresolvedCount += 1;
    }
  }

  return { template, fields, foundCount, unresolvedCount };
}
