import { ResolvedManifest, ValidationResult } from '../types.js';

export function validateOutput(manifest: ResolvedManifest, renderedText: string): ValidationResult {
  const errors: string[] = [];

  for (const label of manifest.template.fieldLabels) {
    const resolved = manifest.fields.get(label);
    if (!resolved) {
      errors.push(`Field "${label}" has no resolved value.`);
      continue;
    }
    if (resolved.status === 'found') {
      if (!resolved.evidence || resolved.evidence.trim().length === 0) {
        errors.push(`Field "${label}" is "found" but has no evidence reference (AC-6).`);
      }
      if (!resolved.value || resolved.value.trim().length === 0) {
        errors.push(`Field "${label}" is "found" but has a blank value (AC-11).`);
      }
    } else if (resolved.status !== 'not-found' && resolved.status !== 'not-specified') {
      errors.push(
        `Field "${label}" has an unrecognized resolution status: "${(resolved as { status: string }).status}".`,
      );
    }
  }

  const expectedLineCount = manifest.template.lines.length;
  const actualLineCount = renderedText.split(/\r\n|\r|\n/).length - 1;
  if (actualLineCount !== expectedLineCount) {
    errors.push(
      `Rendered output has ${actualLineCount} lines but the template structure has ` +
        `${expectedLineCount} - possible truncation or structural drift.`,
    );
  }

  return { valid: errors.length === 0, errors };
}
