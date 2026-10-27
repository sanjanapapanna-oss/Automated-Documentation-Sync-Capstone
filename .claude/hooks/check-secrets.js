#!/usr/bin/env node
/**
 * PreToolUse hook for Write|Edit.
 * Reads the tool-call JSON from stdin, scans the content being written for
 * credential-shaped patterns, and blocks (exit 2) if any are found.
 * Exit 0 = allow. Exit 2 = block, stderr is surfaced to Claude as the reason.
 */
const SECRET_PATTERNS = [
  { name: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/ },
  {
    name: 'AWS Secret Key assignment',
    re: /aws(.{0,20})?secret(.{0,20})?=\s*['"][A-Za-z0-9/+=]{40}['"]/i,
  },
  { name: 'Generic private key block', re: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { name: 'Slack token', re: /xox[baprs]-[0-9A-Za-z-]{10,}/ },
  { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  {
    name: 'Atlassian API token assignment',
    re: /(JIRA|CONFLUENCE)_API_TOKEN\s*=\s*['"]?[A-Za-z0-9]{10,}['"]?/i,
  },
  { name: 'Generic bearer token', re: /Bearer\s+[A-Za-z0-9\-._~+/]{20,}=*/ },
  {
    name: 'Generic API key assignment',
    re: /\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*['"][^'"\s]{12,}['"]/i,
  },
];

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    // If there's no stdin (e.g. manual invocation), resolve quickly.
    if (process.stdin.isTTY) resolve('');
  });
}

function extractContent(payload) {
  const input = payload && payload.tool_input;
  if (!input) return '';
  // Write: { file_path, content }. Edit: { file_path, old_string, new_string }.
  return [input.content, input.new_string, input.old_string].filter(Boolean).join('\n');
}

function placeholderGuard(match, content) {
  const window = content.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20);
  return /example|placeholder|your[-_]|xxx|dummy|redacted|<.*>/i.test(window);
}

async function main() {
  const raw = await readStdin();
  if (!raw) process.exit(0);

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0); // Not JSON — nothing we can check; don't block.
  }

  const filePath = payload?.tool_input?.file_path || '';
  if (/\.(example|sample)\.|\.env\.example$/i.test(filePath)) {
    process.exit(0); // Example/template files are expected to contain placeholder-shaped text.
  }

  const content = extractContent(payload);
  if (!content) process.exit(0);

  for (const { name, re } of SECRET_PATTERNS) {
    const match = re.exec(content);
    if (match && !placeholderGuard(match, content)) {
      process.stderr.write(
        `check-secrets hook: blocked write to "${filePath}" — looks like a ${name} ` +
          `(matched: "${match[0].slice(0, 12)}..."). Remove the credential or confirm it's a ` +
          `placeholder (e.g. rename the file to *.example.* or use an obvious dummy value).\n`,
      );
      process.exit(2);
    }
  }

  process.exit(0);
}

main();
