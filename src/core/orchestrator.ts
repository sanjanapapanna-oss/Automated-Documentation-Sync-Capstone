import { parseTemplate } from './template/parser.js';
import { getExtractor } from './extraction/extractor.js';
import { resolveFields } from './resolution/fieldResolver.js';
import { renderManifest } from './render/renderer.js';
import { validateOutput } from './validation/outputValidator.js';
import { safeReplace } from './io/safeWriter.js';
import { Config, RunResult, TemplateError, RepoError, ReplacementError } from './types.js';

export async function runSync(config: Config): Promise<RunResult> {
  // FR-8(a) failures are checked once, up front - never raised as a side
  // effect of an individual field lookup (design-review Finding 2).
  let parsedTemplate;
  try {
    parsedTemplate = parseTemplate(config.templatePath);
  } catch (err) {
    if (err instanceof TemplateError) {
      return { status: 'failure', errorCode: err.code, errorMessage: err.message };
    }
    return {
      status: 'failure',
      errorCode: 'TEMPLATE_MALFORMED',
      errorMessage: (err as Error).message,
    };
  }

  let extractor;
  try {
    extractor = getExtractor(config.repoPath);
  } catch (err) {
    if (err instanceof RepoError) {
      return { status: 'failure', errorCode: err.code, errorMessage: err.message };
    }
    return { status: 'failure', errorCode: 'REPO_NOT_FOUND', errorMessage: (err as Error).message };
  }

  // FR-8(b): empty/partial repository is not a branch here - it naturally
  // falls out of resolveFields as many "not-found" results, same code path.
  const manifest = resolveFields(parsedTemplate, extractor, config.repoPath);
  const renderedText = renderManifest(manifest);

  const validation = validateOutput(manifest, renderedText);
  if (!validation.valid) {
    return {
      status: 'failure',
      errorCode: 'OUTPUT_VALIDATION_FAILED',
      errorMessage: validation.errors.join('; '),
    };
  }

  try {
    await safeReplace(renderedText, config.outputPath);
  } catch (err) {
    if (err instanceof ReplacementError) {
      return {
        status: 'failure',
        errorCode: 'OUTPUT_REPLACEMENT_FAILED',
        errorMessage: err.message,
      };
    }
    return {
      status: 'failure',
      errorCode: 'OUTPUT_REPLACEMENT_FAILED',
      errorMessage: (err as Error).message,
    };
  }

  return {
    status: 'success',
    foundFieldCount: manifest.foundCount,
    unresolvedFieldCount: manifest.unresolvedCount,
    outputPath: config.outputPath,
  };
}
