import { RunResult } from '../../core/types.js';

export function presentHuman(result: RunResult): string {
  if (result.status === 'success') {
    return [
      'Documentation sync completed successfully.',
      `  Found fields:      ${result.foundFieldCount}`,
      `  Unresolved fields: ${result.unresolvedFieldCount}`,
      `  Output written to: ${result.outputPath}`,
    ].join('\n');
  }
  return [
    'Documentation sync failed.',
    `  Error code:    ${result.errorCode}`,
    `  Error message: ${result.errorMessage}`,
  ].join('\n');
}
