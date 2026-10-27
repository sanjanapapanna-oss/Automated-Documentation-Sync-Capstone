import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import { loadDotEnvIfPresent, resolveConfig } from '../core/config.js';
import { runSync } from '../core/orchestrator.js';
import { registerExtractor } from '../core/extraction/extractor.js';
import { createNodejsExtractor } from '../integrations/extractors/nodejs/index.js';
import { ConfigError } from '../core/types.js';
import { presentCI } from './presenters/ciPresenter.js';
import { presentHuman } from './presenters/humanPresenter.js';

registerExtractor(createNodejsExtractor);

function buildHelpText(): string {
  const program = new Command();
  program
    .name('doc-sync')
    .description(
      'Automated Technical Documentation Sync - populates a master template from a local source repository.',
    )
    .option('--template <path>', 'path to the master documentation template')
    .option('--repo <path>', 'path to the local source repository')
    .option('--output <path>', 'path to write the generated manifest to')
    .option('--ci', 'produce a machine-readable JSON summary instead of console output');
  return program.helpInformation();
}

/**
 * The CLI Entry Point: the only place argv is interpreted end to end, the
 * only place RunResult.status is mapped to a process exit code (so CLI and
 * CI modes can't drift), and a single top-level catch so no unexpected
 * error ever reaches the user as a raw stack trace (NFR-1).
 */
export async function main(argv: readonly string[]): Promise<number> {
  try {
    if (argv.includes('--help') || argv.includes('-h')) {
      process.stdout.write(buildHelpText());
      return 0;
    }
    if (argv.includes('--version') || argv.includes('-V')) {
      process.stdout.write('0.1.0\n');
      return 0;
    }

    const env = loadDotEnvIfPresent(path.resolve(process.cwd(), '.env'));
    const config = resolveConfig(argv, env);

    const result = await runSync(config);

    const output = config.ciMode ? presentCI(result) : presentHuman(result);
    process.stdout.write(`${output}\n`);

    return result.status === 'success' ? 0 : 1;
  } catch (err) {
    if (err instanceof ConfigError) {
      process.stderr.write(`${err.message}\n`);
      return 1;
    }
    process.stderr.write(`Unexpected error: ${(err as Error).message}\n`);
    return 1;
  }
}

/* c8 ignore start */
// Naively comparing import.meta.url to `file://${process.argv[1]}` fails on
// Windows (backslashes, unencoded spaces, drive-letter form all differ from
// a real file:// URL) - pathToFileURL builds the comparison the same way
// Node builds import.meta.url itself, so this works cross-platform.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
/* c8 ignore stop */
