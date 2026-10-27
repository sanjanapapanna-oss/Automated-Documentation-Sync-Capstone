import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runSync } from '../../src/core/orchestrator.js';
import { clearExtractors, registerExtractor } from '../../src/core/extraction/extractor.js';
import { createNodejsExtractor } from '../../src/integrations/extractors/nodejs/index.js';
import { Config, Extractor } from '../../src/core/types.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');
const MASTER_TEMPLATE = path.join(FIXTURES, 'master-template.md');

let dir: string;

beforeAll(() => {
  registerExtractor(createNodejsExtractor);
});

afterAll(() => {
  clearExtractors();
});

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'orchestrator-test-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function baseConfig(overrides: Partial<Config> = {}): Config {
  return {
    templatePath: MASTER_TEMPLATE,
    repoPath: path.join(FIXTURES, 'populated-repo'),
    outputPath: path.join(dir, 'manifest.md'),
    ciMode: false,
    ...overrides,
  };
}

describe('runSync', () => {
  it('succeeds against a populated repository and preserves template structure (AC-1)', async () => {
    const config = baseConfig();
    const result = await runSync(config);
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.foundFieldCount).toBeGreaterThan(0);
    }
    const output = readFileSync(config.outputPath, 'utf8');
    expect(output).toContain('# Technical Application Manifest: {{Service Name}}');
    expect(output).toContain('## Overview');
    expect(output).toContain('- **Service Name**: sample-widget-service');
    expect(output).toContain('- **Owning Team**: Not Specified');
    expect(output.indexOf('## Overview')).toBeLessThan(output.indexOf('## Technical Details'));
  });

  it('succeeds against an empty repository, exit success, fields "Not Found" (AC-2, FR-8(b))', async () => {
    const config = baseConfig({ repoPath: path.join(FIXTURES, 'empty-repo') });
    const result = await runSync(config);
    expect(result.status).toBe('success');
    const output = readFileSync(config.outputPath, 'utf8');
    expect(output).toContain('- **Service Name**: Not Found');
    expect(output).toContain('- **Owning Team**: Not Specified');
  });

  it('succeeds against a partial repository with a mix of found and not-found fields (AC-15)', async () => {
    const config = baseConfig({ repoPath: path.join(FIXTURES, 'partial-repo') });
    const result = await runSync(config);
    expect(result.status).toBe('success');
    const output = readFileSync(config.outputPath, 'utf8');
    expect(output).toContain('- **Service Name**: partial-sample-service');
    expect(output).toContain('- **Repository**: Not Found');
  });

  it('fails with TEMPLATE_NOT_FOUND for a missing template path and leaves no output file (AC-3)', async () => {
    const config = baseConfig({ templatePath: path.join(FIXTURES, 'does-not-exist.md') });
    const result = await runSync(config);
    expect(result).toEqual(
      expect.objectContaining({ status: 'failure', errorCode: 'TEMPLATE_NOT_FOUND' }),
    );
    expect(() => readFileSync(config.outputPath, 'utf8')).toThrow();
  });

  it('fails with REPO_NOT_FOUND for a missing repository path (AC-4)', async () => {
    const config = baseConfig({ repoPath: path.join(FIXTURES, 'does-not-exist-repo') });
    const result = await runSync(config);
    expect(result).toEqual(
      expect.objectContaining({ status: 'failure', errorCode: 'REPO_NOT_FOUND' }),
    );
  });

  it('fails with TEMPLATE_MALFORMED for a template with no fields (AC-5)', async () => {
    const config = baseConfig({ templatePath: path.join(FIXTURES, 'malformed-template.md') });
    const result = await runSync(config);
    expect(result).toEqual(
      expect.objectContaining({ status: 'failure', errorCode: 'TEMPLATE_MALFORMED' }),
    );
  });

  it('never touches a pre-existing valid manifest when a later run fails (AC-13)', async () => {
    const config = baseConfig();
    await runSync(config); // first, successful run
    const validContent = readFileSync(config.outputPath, 'utf8');

    const failingConfig = baseConfig({
      outputPath: config.outputPath,
      templatePath: path.join(FIXTURES, 'does-not-exist.md'),
    });
    const result = await runSync(failingConfig);
    expect(result.status).toBe('failure');
    expect(readFileSync(config.outputPath, 'utf8')).toBe(validContent);
  });

  it('produces byte-identical output across repeated runs on unchanged inputs (AC-7, FR-6)', async () => {
    const config = baseConfig();
    await runSync(config);
    const first = readFileSync(config.outputPath, 'utf8');
    await runSync(config);
    const second = readFileSync(config.outputPath, 'utf8');
    expect(first).toBe(second);
  });

  it('reports a specific error if the template exists but is unparseable, never a crash', async () => {
    const badTemplatePath = path.join(dir, 'empty.md');
    writeFileSync(badTemplatePath, '', 'utf8');
    const config = baseConfig({ templatePath: badTemplatePath });
    const result = await runSync(config);
    expect(result.status).toBe('failure');
  });

  it('reports OUTPUT_VALIDATION_FAILED and writes nothing if a misbehaving extractor produces an invalid manifest', async () => {
    // A deliberately broken extractor: claims "found" but supplies no
    // evidence, which Output Validator must catch (AC-6) before anything is
    // written - proving this safety net works even though no real extractor
    // in this codebase is expected to trigger it.
    const brokenExtractor: Extractor = {
      name: 'broken-test-extractor',
      notSpecifiedFields: new Set(),
      canHandle: () => true,
      lookup: () => ({ status: 'found', value: 'x', evidence: '' }),
    };
    clearExtractors();
    registerExtractor(() => brokenExtractor);

    try {
      const config = baseConfig();
      const result = await runSync(config);
      expect(result).toEqual(
        expect.objectContaining({ status: 'failure', errorCode: 'OUTPUT_VALIDATION_FAILED' }),
      );
      expect(existsSync(config.outputPath)).toBe(false);
    } finally {
      clearExtractors();
      registerExtractor(createNodejsExtractor);
    }
  });
});
