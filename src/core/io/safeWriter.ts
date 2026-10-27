import * as fsp from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { randomBytes } from 'node:crypto';
import { ReplacementError } from '../types.js';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cleanup(tempPath: string): Promise<void> {
  try {
    await fsp.unlink(tempPath);
  } catch {
    // Already gone, or never created successfully - nothing further to clean up.
  }
}

/**
 * Writes `content` to a temp file beside `destinationPath`, then replaces the
 * destination only via rename. On any failure, the temp file is always
 * cleaned up and the pre-existing destination (if any) is left untouched -
 * rename() either fully replaces the destination or doesn't touch it at all.
 */
export async function safeReplace(content: string, destinationPath: string): Promise<void> {
  const dir = dirname(destinationPath);
  const tempPath = join(dir, `.${basename(destinationPath)}.tmp-${randomBytes(6).toString('hex')}`);

  try {
    await fsp.writeFile(tempPath, content, 'utf8');
  } catch (err) {
    await cleanup(tempPath);
    throw new ReplacementError(`Failed to write temporary output file: ${(err as Error).message}`);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await fsp.rename(tempPath, destinationPath);
      return;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  await cleanup(tempPath);
  throw new ReplacementError(
    `Failed to replace output file at "${destinationPath}" after ${MAX_ATTEMPTS} attempts: ` +
      `${(lastError as Error).message}`,
  );
}
