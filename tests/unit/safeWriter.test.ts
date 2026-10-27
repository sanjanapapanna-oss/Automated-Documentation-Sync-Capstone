import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { safeReplace } from '../../src/core/io/safeWriter.js';
import { ReplacementError } from '../../src/core/types.js';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return { ...actual, rename: vi.fn(actual.rename) };
});

const fsp = await import('node:fs/promises');

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'safe-writer-test-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

describe('safeReplace', () => {
  it('creates the output file when it does not exist yet', async () => {
    const dest = path.join(dir, 'manifest.md');
    await safeReplace('hello world', dest);
    expect(readFileSync(dest, 'utf8')).toBe('hello world');
  });

  it('replaces existing content on success and leaves no stray temp file', async () => {
    const dest = path.join(dir, 'manifest.md');
    await safeReplace('version 1', dest);
    await safeReplace('version 2', dest);
    expect(readFileSync(dest, 'utf8')).toBe('version 2');
    const leftovers = readdirSync(dir).filter((f) => f.includes('.tmp-'));
    expect(leftovers).toEqual([]);
  });

  it('preserves the existing valid manifest and cleans up the temp file when replacement persistently fails', async () => {
    const dest = path.join(dir, 'manifest.md');
    await safeReplace('original valid content', dest);

    const renameMock = vi.mocked(fsp.rename);
    renameMock.mockClear(); // drop the call count from the setup `safeReplace` above
    const busyError = new Error('EBUSY: resource busy');
    renameMock
      .mockRejectedValueOnce(busyError)
      .mockRejectedValueOnce(busyError)
      .mockRejectedValueOnce(busyError);

    await expect(safeReplace('new content that should never land', dest)).rejects.toThrowError(
      ReplacementError,
    );

    expect(readFileSync(dest, 'utf8')).toBe('original valid content');
    const leftovers = readdirSync(dir).filter((f) => f.includes('.tmp-'));
    expect(leftovers).toEqual([]);
    expect(renameMock).toHaveBeenCalledTimes(3);
  });

  it('throws ReplacementError if the destination directory does not exist', async () => {
    const dest = path.join(dir, 'nonexistent-subdir', 'manifest.md');
    await expect(safeReplace('content', dest)).rejects.toThrowError(ReplacementError);
    expect(existsSync(dest)).toBe(false);
  });
});
