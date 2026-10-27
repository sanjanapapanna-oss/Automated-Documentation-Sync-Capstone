import { describe, expect, it } from 'vitest';
import { renderManifest } from '../../src/core/render/renderer.js';
import { ParsedTemplate, ResolvedField, ResolvedManifest } from '../../src/core/types.js';

function buildManifest(fieldStatuses: Record<string, ResolvedField>): ResolvedManifest {
  const template: ParsedTemplate = {
    lines: [
      { kind: 'other', text: '# Manifest' },
      { kind: 'other', text: '' },
      { kind: 'field', label: 'Service Name', prefix: '- **Service Name**:' },
      { kind: 'field', label: 'Owning Team', prefix: '- **Owning Team**:' },
      { kind: 'field', label: 'Databases', prefix: '- **Databases**:' },
    ],
    fieldLabels: ['Service Name', 'Owning Team', 'Databases'],
  };
  const fields = new Map(Object.entries(fieldStatuses));
  return { template, fields, foundCount: 0, unresolvedCount: 0 };
}

describe('renderManifest', () => {
  it('renders found, not-found, and not-specified values correctly, preserving structure', () => {
    const manifest = buildManifest({
      'Service Name': { status: 'found', value: 'widget-service', evidence: 'package.json#name' },
      'Owning Team': { status: 'not-specified' },
      Databases: { status: 'not-found' },
    });
    const output = renderManifest(manifest);
    expect(output).toBe(
      [
        '# Manifest',
        '',
        '- **Service Name**: widget-service',
        '- **Owning Team**: Not Specified',
        '- **Databases**: Not Found',
        '',
      ].join('\n'),
    );
  });

  it('is deterministic across repeated calls with the same input', () => {
    const manifest = buildManifest({
      'Service Name': { status: 'found', value: 'widget-service', evidence: 'package.json#name' },
      'Owning Team': { status: 'not-specified' },
      Databases: { status: 'not-found' },
    });
    expect(renderManifest(manifest)).toBe(renderManifest(manifest));
  });

  it('falls back to "Not Found" for a field with no resolved entry at all', () => {
    const manifest = buildManifest({
      'Service Name': { status: 'found', value: 'x', evidence: 'y' },
      'Owning Team': { status: 'not-specified' },
    });
    const output = renderManifest(manifest);
    expect(output).toContain('- **Databases**: Not Found');
  });
});
