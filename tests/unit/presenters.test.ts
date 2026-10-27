import { describe, expect, it } from 'vitest';
import { presentHuman } from '../../src/cli/presenters/humanPresenter.js';
import { presentCI } from '../../src/cli/presenters/ciPresenter.js';
import { RunResult } from '../../src/core/types.js';

const successResult: RunResult = {
  status: 'success',
  foundFieldCount: 5,
  unresolvedFieldCount: 12,
  outputPath: '/out/manifest.md',
};

const failureResult: RunResult = {
  status: 'failure',
  errorCode: 'TEMPLATE_NOT_FOUND',
  errorMessage: 'Template not found at "/missing.md".',
};

describe('presentHuman', () => {
  it('summarizes a successful run with counts and output path', () => {
    const text = presentHuman(successResult);
    expect(text).toContain('completed successfully');
    expect(text).toContain('5');
    expect(text).toContain('12');
    expect(text).toContain('/out/manifest.md');
  });

  it('summarizes a failed run with the error code and message', () => {
    const text = presentHuman(failureResult);
    expect(text).toContain('failed');
    expect(text).toContain('TEMPLATE_NOT_FOUND');
    expect(text).toContain('Template not found');
  });
});

describe('presentCI (FR-11 schema, AC-14)', () => {
  it('includes status, found-field count, unresolved-field count, and output path on success', () => {
    const parsed = JSON.parse(presentCI(successResult));
    expect(parsed).toEqual({
      status: 'success',
      foundFieldCount: 5,
      unresolvedFieldCount: 12,
      outputPath: '/out/manifest.md',
    });
  });

  it('includes status, errorCode, and errorMessage on failure', () => {
    const parsed = JSON.parse(presentCI(failureResult));
    expect(parsed).toEqual({
      status: 'failure',
      errorCode: 'TEMPLATE_NOT_FOUND',
      errorMessage: 'Template not found at "/missing.md".',
    });
  });

  it('produces valid, parseable JSON in both cases', () => {
    expect(() => JSON.parse(presentCI(successResult))).not.toThrow();
    expect(() => JSON.parse(presentCI(failureResult))).not.toThrow();
  });
});
