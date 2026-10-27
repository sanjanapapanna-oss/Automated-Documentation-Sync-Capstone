import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { parseTemplate } from '../../src/core/template/parser.js';
import { TemplateError } from '../../src/core/types.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');

describe('parseTemplate', () => {
  it('preserves field order and structure from the master template', () => {
    const result = parseTemplate(path.join(FIXTURES, 'master-template.md'));
    expect(result.fieldLabels).toEqual([
      'Service Name',
      'Owning Team',
      'Repository',
      'Primary Language / Runtime',
      'Entry Point',
      'Key Dependencies',
      'Build / Package Manager',
      'Exposed Endpoints / APIs',
      'Exposed CLI Commands',
      'Databases',
      'Third-Party Services',
      'Messaging / Queues',
      'Deployment Target',
      'CI/CD Pipeline',
      'Logging Approach',
      'Configuration Source',
      'Known Limitations',
    ]);
    const headingLines = result.lines.filter((l) => l.kind === 'other' && l.text.startsWith('## '));
    expect(headingLines).toHaveLength(7);
  });

  it('throws TEMPLATE_NOT_FOUND for a missing path', () => {
    expect(() => parseTemplate(path.join(FIXTURES, 'does-not-exist.md'))).toThrowError(
      TemplateError,
    );
    try {
      parseTemplate(path.join(FIXTURES, 'does-not-exist.md'));
    } catch (err) {
      expect((err as TemplateError).code).toBe('TEMPLATE_NOT_FOUND');
    }
  });

  it('throws TEMPLATE_MALFORMED for a template with no fields', () => {
    try {
      parseTemplate(path.join(FIXTURES, 'malformed-template.md'));
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      expect((err as TemplateError).code).toBe('TEMPLATE_MALFORMED');
    }
  });

  it('throws TEMPLATE_MALFORMED for duplicate field labels', () => {
    try {
      parseTemplate(path.join(FIXTURES, 'duplicate-field-template.md'));
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateError);
      expect((err as TemplateError).code).toBe('TEMPLATE_MALFORMED');
    }
  });
});
