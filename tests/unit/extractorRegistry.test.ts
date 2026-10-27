import { afterEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import {
  clearExtractors,
  getExtractor,
  registerExtractor,
} from '../../src/core/extraction/extractor.js';
import { Extractor, RepoError } from '../../src/core/types.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');

function stubExtractor(name: string, canHandle: boolean): Extractor {
  return {
    name,
    notSpecifiedFields: new Set(),
    canHandle: () => canHandle,
    lookup: () => ({ status: 'not-found' }),
  };
}

describe('Extractor Registry', () => {
  afterEach(() => {
    clearExtractors();
  });

  it('throws REPO_NOT_FOUND for a missing repo path', () => {
    expect(() => getExtractor(path.join(FIXTURES, 'does-not-exist'))).toThrowError(RepoError);
  });

  it('throws REPO_NOT_FOUND when the repo path is not a directory', () => {
    expect(() => getExtractor(path.join(FIXTURES, 'master-template.md'))).toThrowError(RepoError);
  });

  it('throws REPO_NOT_FOUND when no registered extractor can handle the repo', () => {
    registerExtractor(() => stubExtractor('never-matches', false));
    expect(() => getExtractor(path.join(FIXTURES, 'populated-repo'))).toThrowError(RepoError);
  });

  it('selects the first extractor whose canHandle matches, demonstrating AC-9 extensibility', () => {
    registerExtractor(() => stubExtractor('future-python-extractor', false));
    registerExtractor(() => stubExtractor('nodejs-extractor', true));
    const extractor = getExtractor(path.join(FIXTURES, 'populated-repo'));
    expect(extractor.name).toBe('nodejs-extractor');
  });
});
