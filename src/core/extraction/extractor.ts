import { statSync } from 'node:fs';
import { Extractor, RepoError } from '../types.js';

export type { Extractor } from '../types.js';

type ExtractorFactory = () => Extractor;

const registeredExtractors: ExtractorFactory[] = [];

/**
 * Adding a new stack's extractor means calling this once with a new factory -
 * no change to Template Parser, Field Resolver, Output Renderer, or Output
 * Validator is required (NFR-4 / AC-9).
 */
export function registerExtractor(factory: ExtractorFactory): void {
  registeredExtractors.push(factory);
}

export function clearExtractors(): void {
  registeredExtractors.length = 0;
}

export function getExtractor(repoPath: string): Extractor {
  let isDirectory: boolean;
  try {
    isDirectory = statSync(repoPath).isDirectory();
  } catch (err) {
    throw new RepoError(
      'REPO_NOT_FOUND',
      `Source repository not found or inaccessible at "${repoPath}": ${(err as Error).message}`,
    );
  }
  if (!isDirectory) {
    throw new RepoError(
      'REPO_NOT_FOUND',
      `Source repository path "${repoPath}" is not a directory.`,
    );
  }

  for (const factory of registeredExtractors) {
    const extractor = factory();
    if (extractor.canHandle(repoPath)) {
      return extractor;
    }
  }

  throw new RepoError(
    'REPO_NOT_FOUND',
    `No registered extractor can handle the repository at "${repoPath}".`,
  );
}
