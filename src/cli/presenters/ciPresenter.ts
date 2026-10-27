import { RunResult } from '../../core/types.js';

/**
 * Produces the minimum JSON summary schema defined in requirements.md FR-11:
 * on success - status, found-field count, unresolved-field count, output
 * path; on failure - status, errorCode, errorMessage.
 */
export function presentCI(result: RunResult): string {
  if (result.status === 'success') {
    return JSON.stringify(
      {
        status: 'success',
        foundFieldCount: result.foundFieldCount,
        unresolvedFieldCount: result.unresolvedFieldCount,
        outputPath: result.outputPath,
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      status: 'failure',
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    },
    null,
    2,
  );
}
