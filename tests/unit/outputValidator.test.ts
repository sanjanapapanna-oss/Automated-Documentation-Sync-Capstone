import { describe, expect, it } from 'vitest';
import { renderManifest } from '../../src/core/render/renderer.js';
import { validateOutput } from '../../src/core/validation/outputValidator.js';
import { ParsedTemplate, ResolvedField, ResolvedManifest } from '../../src/core/types.js';

function buildManifest(fieldStatuses: Record<string, ResolvedField>): ResolvedManifest {
  const template: ParsedTemplate = {
    lines: [
      { kind: 'other', text: '# Manifest' },
      { kind: 'field', label: 'Service Name', prefix: '- **Service Name**:' },
      { kind: 'field', label: 'Owning Team', prefix: '- **Owning Team**:' },
    ],
    fieldLabels: ['Service Name', 'Owning Team'],
  };
  const fields = new Map(Object.entries(fieldStatuses));
  return { template, fields, foundCount: 0, unresolvedCount: 0 };
}

describe('validateOutput', () => {
  it('passes for a fully and correctly resolved manifest', () => {
    const manifest = buildManifest({
      'Service Name': { status: 'found', value: 'widget', evidence: 'package.json#name' },
      'Owning Team': { status: 'not-specified' },
    });
    const result = validateOutput(manifest, renderManifest(manifest));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when a field has no resolved entry (AC-11)', () => {
    const manifest = buildManifest({
      'Service Name': { status: 'found', value: 'widget', evidence: 'package.json#name' },
    });
    const result = validateOutput(manifest, renderManifest(manifest));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Owning Team'))).toBe(true);
  });

  it('fails when a "found" field has no evidence reference (AC-6)', () => {
    const manifest = buildManifest({
      'Service Name': { status: 'found', value: 'widget', evidence: '' },
      'Owning Team': { status: 'not-specified' },
    });
    const result = validateOutput(manifest, renderManifest(manifest));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('AC-6'))).toBe(true);
  });

  it('fails when a "found" field has a blank value', () => {
    const manifest = buildManifest({
      'Service Name': { status: 'found', value: '  ', evidence: 'package.json#name' },
      'Owning Team': { status: 'not-specified' },
    });
    const result = validateOutput(manifest, renderManifest(manifest));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('AC-11'))).toBe(true);
  });

  it('fails when the rendered text line count does not match the template structure', () => {
    const manifest = buildManifest({
      'Service Name': { status: 'found', value: 'widget', evidence: 'package.json#name' },
      'Owning Team': { status: 'not-specified' },
    });
    const truncated = 'only one line';
    const result = validateOutput(manifest, truncated);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('possible truncation'))).toBe(true);
  });
});
