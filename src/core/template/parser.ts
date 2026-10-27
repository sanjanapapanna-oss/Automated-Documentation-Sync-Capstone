import { readFileSync } from 'node:fs';
import { ParsedTemplate, TemplateLine, TemplateError } from '../types.js';

const FIELD_LINE_RE = /^(-\s+\*\*(.+?)\*\*:)\s*(.*)$/;

export function parseTemplate(path: string): ParsedTemplate {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    throw new TemplateError(
      'TEMPLATE_NOT_FOUND',
      `Template not found or unreadable at "${path}": ${(err as Error).message}`,
    );
  }

  const rawLines = raw.split(/\r\n|\r|\n/);
  const lines: TemplateLine[] = [];
  const fieldLabels: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < rawLines.length; index += 1) {
    const lineText = rawLines[index] ?? '';
    const match = FIELD_LINE_RE.exec(lineText);
    if (match) {
      const prefix = match[1] ?? '';
      const label = match[2] ?? '';
      if (seen.has(label)) {
        throw new TemplateError(
          'TEMPLATE_MALFORMED',
          `Duplicate field "${label}" at line ${index + 1} in "${path}".`,
        );
      }
      seen.add(label);
      fieldLabels.push(label);
      lines.push({ kind: 'field', label, prefix });
    } else {
      lines.push({ kind: 'other', text: lineText });
    }
  }

  if (fieldLabels.length === 0) {
    throw new TemplateError(
      'TEMPLATE_MALFORMED',
      `No fields found in template "${path}" - expected lines like "- **Field Label**: value".`,
    );
  }

  return { lines, fieldLabels };
}
