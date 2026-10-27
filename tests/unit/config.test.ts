import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadDotEnvIfPresent, resolveConfig } from '../../src/core/config.js';
import { ConfigError } from '../../src/core/types.js';

describe('resolveConfig', () => {
  it('accepts ordinary CLI arguments for template, repo, and output (AC-10a)', () => {
    const config = resolveConfig(['--template', '/t.md', '--repo', '/r', '--output', '/o.md'], {});
    expect(config).toEqual({
      templatePath: '/t.md',
      repoPath: '/r',
      outputPath: '/o.md',
      ciMode: false,
    });
  });

  it('supports --flag=value syntax', () => {
    const config = resolveConfig(['--template=/t.md', '--ci'], {});
    expect(config.templatePath).toBe('/t.md');
    expect(config.ciMode).toBe(true);
  });

  it('falls back to environment variables when no CLI flag is given', () => {
    const config = resolveConfig([], {
      DOC_SYNC_TEMPLATE_PATH: '/env-t.md',
      DOC_SYNC_SOURCE_REPO_PATH: '/env-r',
      DOC_SYNC_OUTPUT_PATH: '/env-o.md',
    });
    expect(config).toEqual({
      templatePath: '/env-t.md',
      repoPath: '/env-r',
      outputPath: '/env-o.md',
      ciMode: false,
    });
  });

  it('CLI flag overrides the environment variable when both are given', () => {
    const config = resolveConfig(['--template', '/cli-t.md'], {
      DOC_SYNC_TEMPLATE_PATH: '/env-t.md',
    });
    expect(config.templatePath).toBe('/cli-t.md');
  });

  it('allows --help and --version without rejection (design-review Finding 1)', () => {
    expect(() => resolveConfig(['--help'], {})).not.toThrow();
    expect(() => resolveConfig(['--version'], {})).not.toThrow();
    expect(() => resolveConfig(['-h'], {})).not.toThrow();
    expect(() => resolveConfig(['-V'], {})).not.toThrow();
  });

  it('rejects a secret-shaped flag without including its value anywhere (AC-10b)', () => {
    try {
      resolveConfig(['--jira-api-token=super-secret-value-123'], {});
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const message = (err as ConfigError).message;
      expect(message).toContain('--jira-api-token');
      expect(message).not.toContain('super-secret-value-123');
    }
  });

  it('fails closed on an unrecognized flag without echoing its value (AC-10c)', () => {
    try {
      resolveConfig(['--totally-unknown-flag', 'some-value'], {});
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const message = (err as ConfigError).message;
      expect(message).toContain('--totally-unknown-flag');
      expect(message).not.toContain('some-value');
    }
  });
});

describe('loadDotEnvIfPresent', () => {
  let dir: string;

  it('merges KEY=VALUE lines from a .env file without overriding existing env vars', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dotenv-test-'));
    const envPath = path.join(dir, '.env');
    writeFileSync(
      envPath,
      [
        '# a comment',
        'DOC_SYNC_TEMPLATE_PATH=/from-dotenv.md',
        'ALREADY_SET=should-not-override',
        '',
      ].join('\n'),
      'utf8',
    );
    const merged = loadDotEnvIfPresent(envPath, { ALREADY_SET: 'original-value' });
    expect(merged.DOC_SYNC_TEMPLATE_PATH).toBe('/from-dotenv.md');
    expect(merged.ALREADY_SET).toBe('original-value');
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns the base environment unchanged when no .env file exists', () => {
    const merged = loadDotEnvIfPresent('/path/does/not/exist/.env', { FOO: 'bar' });
    expect(merged).toEqual({ FOO: 'bar' });
  });
});
