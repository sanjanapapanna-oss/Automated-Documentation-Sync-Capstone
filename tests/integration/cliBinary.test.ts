import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Regression test for the Critical finding from code-review-report.md: the
 * "run directly" entry-point guard (`import.meta.url === file://${argv[1]}`)
 * never matched on Windows, so main() was silently never invoked when the
 * compiled binary was actually run as a real process - every other test in
 * this suite calls main() directly and would never have caught this, since
 * they bypass the entry-point guard entirely. This test spawns the real
 * compiled dist/cli/index.js as a subprocess, exactly like an end user
 * would, so it exercises the exact code path that broke.
 *
 * Requires `npm run build` to have run first - `npm run verify` enforces
 * this ordering (build before test).
 */

const REPO_ROOT = path.resolve(__dirname, '../..');
const CLI_ENTRY = path.join(REPO_ROOT, 'dist', 'cli', 'index.js');
const FIXTURES = path.join(REPO_ROOT, 'tests', 'fixtures');

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'cli-binary-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('compiled CLI binary (subprocess regression test)', () => {
  it('dist/cli/index.js exists (build ran before this test, as npm run verify requires)', () => {
    expect(existsSync(CLI_ENTRY)).toBe(true);
  });

  it('actually invokes main() and writes a real output file when run as a real process', () => {
    const outputPath = path.join(dir, 'manifest.md');
    const result = spawnSync(
      process.execPath,
      [
        CLI_ENTRY,
        '--template',
        path.join(FIXTURES, 'master-template.md'),
        '--repo',
        path.join(FIXTURES, 'populated-repo'),
        '--output',
        outputPath,
      ],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('completed successfully');
    expect(existsSync(outputPath)).toBe(true);
    expect(readFileSync(outputPath, 'utf8')).toContain('sample-widget-service');
  });

  it('prints real help text and exits 0 for --help as a real process', () => {
    const result = spawnSync(process.execPath, [CLI_ENTRY, '--help'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('doc-sync');
  });

  it('exits non-zero with a real error message for a real failure as a subprocess', () => {
    const result = spawnSync(
      process.execPath,
      [
        CLI_ENTRY,
        '--template',
        path.join(FIXTURES, 'does-not-exist.md'),
        '--repo',
        path.join(FIXTURES, 'populated-repo'),
        '--output',
        path.join(dir, 'manifest.md'),
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('TEMPLATE_NOT_FOUND');
  });
});
