import { ResolvedManifest } from '../types.js';

export function renderManifest(manifest: ResolvedManifest): string {
  const outputLines: string[] = [];

  for (const line of manifest.template.lines) {
    if (line.kind === 'other') {
      outputLines.push(line.text);
      continue;
    }

    const resolved = manifest.fields.get(line.label);
    let value: string;
    if (!resolved || resolved.status === 'not-found') {
      value = 'Not Found';
    } else if (resolved.status === 'not-specified') {
      value = 'Not Specified';
    } else {
      value = resolved.value;
    }
    outputLines.push(`${line.prefix} ${value}`);
  }

  return `${outputLines.join('\n')}\n`;
}
