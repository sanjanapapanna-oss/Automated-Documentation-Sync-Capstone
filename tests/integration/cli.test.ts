import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { main } from '../../src/cli/index.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');
const MASTER_TEMPLATE = path.join(FIXTURES, 'master-template.md');
const POPULATED_REPO = path.join(FIXTURES, 'populated-repo');

let dir: string;
let stdout: string[];
let stderr: string[];
let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'cli-test-'));
  stdout = [];
  stderr = [];
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    stdout.push(String(chunk));
    return true;
  });
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
    stderr.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
  rmSync(dir, { recursive: true, force: true });
});

describe('CLI main()', () => {
  it('exits 0 and writes a human-readable summary on a successful run', async () => {
    const outputPath = path.join(dir, 'manifest.md');
    const code = await main([
      '--template',
      MASTER_TEMPLATE,
      '--repo',
      POPULATED_REPO,
      '--output',
      outputPath,
    ]);
    expect(code).toBe(0);
    expect(stdout.join('')).toContain('completed successfully');
    expect(readFileSync(outputPath, 'utf8')).toContain('sample-widget-service');
  });

  it('exits 0 and writes FR-11-shaped JSON in --ci mode (AC-8, AC-14)', async () => {
    const outputPath = path.join(dir, 'manifest.md');
    const code = await main([
      '--template',
      MASTER_TEMPLATE,
      '--repo',
      POPULATED_REPO,
      '--output',
      outputPath,
      '--ci',
    ]);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join(''));
    expect(parsed.status).toBe('success');
    expect(typeof parsed.foundFieldCount).toBe('number');
    expect(typeof parsed.unresolvedFieldCount).toBe('number');
    expect(parsed.outputPath).toBe(outputPath);
  });

  it('exits non-zero on a tool-level failure without crashing', async () => {
    const code = await main([
      '--template',
      path.join(FIXTURES, 'does-not-exist.md'),
      '--repo',
      POPULATED_REPO,
      '--output',
      path.join(dir, 'manifest.md'),
    ]);
    expect(code).toBe(1);
    expect(stdout.join('')).toContain('failed');
  });

  it('prints help text for --help without error (does not reject it as unrecognized)', async () => {
    const code = await main(['--help']);
    expect(code).toBe(0);
    expect(stdout.join('')).toContain('doc-sync');
  });

  it('rejects a secret-shaped flag end to end, never echoing its value (AC-10b)', async () => {
    const code = await main(['--jira-api-token=super-secret-value-xyz']);
    expect(code).toBe(1);
    const errorOutput = stderr.join('');
    expect(errorOutput).toContain('--jira-api-token');
    expect(errorOutput).not.toContain('super-secret-value-xyz');
  });

  it('rejects an unrecognized flag end to end, never echoing its value (AC-10c)', async () => {
    const code = await main(['--totally-unknown-flag', 'some-value']);
    expect(code).toBe(1);
    const errorOutput = stderr.join('');
    expect(errorOutput).toContain('--totally-unknown-flag');
    expect(errorOutput).not.toContain('some-value');
  });
});
