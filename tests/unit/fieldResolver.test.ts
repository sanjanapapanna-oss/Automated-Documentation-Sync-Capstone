import { describe, expect, it, vi } from 'vitest';
import { resolveFields } from '../../src/core/resolution/fieldResolver.js';
import { Extractor, ParsedTemplate } from '../../src/core/types.js';

const template: ParsedTemplate = {
  lines: [
    { kind: 'field', label: 'Service Name', prefix: '- **Service Name**: ' },
    { kind: 'field', label: 'Owning Team', prefix: '- **Owning Team**: ' },
    { kind: 'field', label: 'Databases', prefix: '- **Databases**: ' },
    { kind: 'field', label: 'Logging Approach', prefix: '- **Logging Approach**: ' },
  ],
  fieldLabels: ['Service Name', 'Owning Team', 'Databases', 'Logging Approach'],
};

describe('resolveFields', () => {
  it('resolves "Not Specified" without ever calling lookup for that field (safeguard)', () => {
    const lookup = vi.fn((label: string) => {
      if (label === 'Owning Team') throw new Error('lookup must never be called for this field');
      return { status: 'found' as const, value: 'x', evidence: 'y' };
    });
    const extractor: Extractor = {
      name: 'test',
      notSpecifiedFields: new Set(['Owning Team']),
      canHandle: () => true,
      lookup,
    };

    const manifest = resolveFields(template, extractor, '/repo');
    expect(manifest.fields.get('Owning Team')).toEqual({ status: 'not-specified' });
    expect(lookup).not.toHaveBeenCalledWith('Owning Team', '/repo');
  });

  it('passes through found and not-found results from the extractor', () => {
    const extractor: Extractor = {
      name: 'test',
      notSpecifiedFields: new Set(),
      canHandle: () => true,
      lookup: (label) =>
        label === 'Service Name'
          ? { status: 'found', value: 'widget', evidence: 'package.json#name' }
          : { status: 'not-found' },
    };

    const manifest = resolveFields(template, extractor, '/repo');
    expect(manifest.fields.get('Service Name')).toEqual({
      status: 'found',
      value: 'widget',
      evidence: 'package.json#name',
    });
    expect(manifest.fields.get('Databases')).toEqual({ status: 'not-found' });
  });

  it('contains an unexpected per-field error to just that field, not the whole run (Finding 2)', () => {
    const extractor: Extractor = {
      name: 'test',
      notSpecifiedFields: new Set(),
      canHandle: () => true,
      lookup: (label) => {
        if (label === 'Databases') throw new Error('EACCES: permission denied');
        return { status: 'found', value: 'ok', evidence: 'somewhere' };
      },
    };

    const manifest = resolveFields(template, extractor, '/repo');
    expect(manifest.fields.get('Databases')).toEqual({ status: 'not-found' });
    expect(manifest.fields.get('Service Name')).toEqual({
      status: 'found',
      value: 'ok',
      evidence: 'somewhere',
    });
    expect(manifest.fields.get('Logging Approach')).toEqual({
      status: 'found',
      value: 'ok',
      evidence: 'somewhere',
    });
  });

  it('computes found/unresolved counts correctly (AC-15 mixed-field case)', () => {
    const extractor: Extractor = {
      name: 'test',
      notSpecifiedFields: new Set(['Owning Team']),
      canHandle: () => true,
      lookup: (label) =>
        label === 'Service Name'
          ? { status: 'found', value: 'widget', evidence: 'package.json#name' }
          : { status: 'not-found' },
    };

    const manifest = resolveFields(template, extractor, '/repo');
    expect(manifest.foundCount).toBe(1);
    expect(manifest.unresolvedCount).toBe(3);
  });
});
