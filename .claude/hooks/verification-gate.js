#!/usr/bin/env node
/**
 * PreToolUse hook for Bash, matched in settings.json to commands that create a PR
 * or push to a remote. Deterministic, mechanical gate only — the actual judgment
 * (did verification really pass, is a human exception documented) stays with the
 * verifier/pr-preparer agents. This hook just checks the report file exists and
 * doesn't say FAIL on its own first line.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

function findVerificationReports(cwd) {
  const outputDir = resolve(cwd, 'output');
  if (!existsSync(outputDir)) return [];
  return readdirSync(outputDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(outputDir, entry.name, 'verification-report.md'))
    .filter((path) => existsSync(path));
}

function readStdin() {
  return new Promise((resolveP) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolveP(data));
    if (process.stdin.isTTY) resolveP('');
  });
}

const GATED_COMMAND_RE = /\b(gh\s+pr\s+create|git\s+push)\b/i;

async function main() {
  const raw = await readStdin();
  if (!raw) process.exit(0);

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const command = payload?.tool_input?.command || '';
  if (!GATED_COMMAND_RE.test(command)) process.exit(0); // Not a gated command.

  const reportPaths = findVerificationReports(process.cwd());
  if (reportPaths.length === 0) {
    process.stderr.write(
      'verification-gate hook: blocked — no verification-report.md found under any ' +
        'output/<user-story-slug>/ folder. Run /verify (Stage 7) before pushing or creating a PR.\n',
    );
    process.exit(2);
  }

  for (const reportPath of reportPaths) {
    const report = readFileSync(reportPath, 'utf8');
    const hasUnresolvedFailure =
      /unresolved\s+(mandatory\s+)?failure/i.test(report) ||
      /overall status\s*:\s*(not verified|failed|blocked)/i.test(report);

    if (hasUnresolvedFailure) {
      process.stderr.write(
        `verification-gate hook: blocked — ${reportPath} records an unresolved mandatory ` +
          'failure or a non-passing overall status. Resolve it, or get an explicit ' +
          'human-approved exception documented in the report, before pushing or creating a PR.\n',
      );
      process.exit(2);
    }
  }

  process.exit(0);
}

main();
