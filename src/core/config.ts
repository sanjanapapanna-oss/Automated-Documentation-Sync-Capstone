import { readFileSync } from 'node:fs';
import { Config, ConfigError } from './types.js';

const VALUE_FLAGS = new Set(['--template', '--repo', '--output']);
const BOOLEAN_FLAGS = new Set(['--ci', '--help', '-h', '--version', '-V']);
const SECRET_PATTERN = /token|secret|key|password|credential/i;

function flagName(token: string): string {
  const eq = token.indexOf('=');
  return eq === -1 ? token : token.slice(0, eq);
}

/**
 * Enforces NFR-3 before any file I/O and before any CLI-parsing library sees
 * argv: only the documented flags are accepted, and a rejection never
 * includes the flag's value, in the message or anywhere else.
 */
export function preScanArgv(argv: readonly string[]): void {
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? '';
    if (!token.startsWith('-')) continue;

    const name = flagName(token);
    if (VALUE_FLAGS.has(name)) {
      if (!token.includes('=')) i += 1; // the following token is this flag's value - skip it
      continue;
    }
    if (BOOLEAN_FLAGS.has(name)) continue;

    if (SECRET_PATTERN.test(name)) {
      throw new ConfigError(
        'CONFIG_REJECTED_FLAG',
        `Rejected flag "${name}": secret-shaped configuration must be provided via an ` +
          `environment variable, never a CLI argument.`,
      );
    }
    throw new ConfigError(
      'CONFIG_REJECTED_FLAG',
      `Rejected flag "${name}": not a recognized option.`,
    );
  }
}

function getFlagValue(argv: readonly string[], name: string): string | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? '';
    if (token === name) return argv[i + 1];
    if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
  }
  return undefined;
}

export function resolveConfig(
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
): Config {
  preScanArgv(argv);

  const templatePath = getFlagValue(argv, '--template') ?? env.DOC_SYNC_TEMPLATE_PATH ?? '';
  const repoPath = getFlagValue(argv, '--repo') ?? env.DOC_SYNC_SOURCE_REPO_PATH ?? '';
  const outputPath = getFlagValue(argv, '--output') ?? env.DOC_SYNC_OUTPUT_PATH ?? '';
  const ciMode = argv.some((a) => flagName(a) === '--ci');

  return { templatePath, repoPath, outputPath, ciMode };
}

/**
 * Merges a .env file (if present) into a copy of the given base environment,
 * never overriding a variable the base environment already set. Reads only
 * KEY=VALUE lines; never logs or returns anything beyond the merged map
 * itself, which callers must only ever consult by exact key (never
 * enumerated or printed wholesale) to keep unrelated secrets contained.
 */
export function loadDotEnvIfPresent(
  dotEnvPath: string,
  baseEnv: Readonly<Record<string, string | undefined>> = process.env,
): Record<string, string | undefined> {
  const merged: Record<string, string | undefined> = { ...baseEnv };

  let raw: string;
  try {
    raw = readFileSync(dotEnvPath, 'utf8');
  } catch {
    return merged;
  }

  for (const line of raw.split(/\r\n|\r|\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (merged[key] === undefined) {
      merged[key] = value;
    }
  }

  return merged;
}
