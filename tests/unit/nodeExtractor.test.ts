import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { createNodejsExtractor } from '../../src/integrations/extractors/nodejs/index.js';

const FIXTURES = path.resolve(__dirname, '../fixtures');
const POPULATED = path.join(FIXTURES, 'populated-repo');
const PARTIAL = path.join(FIXTURES, 'partial-repo');
const EMPTY = path.join(FIXTURES, 'empty-repo');
const STRING_BIN = path.join(FIXTURES, 'string-bin-repo');

describe('Node.js/TypeScript Extractor', () => {
  const extractor = createNodejsExtractor();

  it('canHandle is always true for v1 (so empty repos still resolve, not reject)', () => {
    expect(extractor.canHandle(EMPTY)).toBe(true);
    expect(extractor.canHandle(POPULATED)).toBe(true);
  });

  it('declares exactly "Owning Team" as its fixed Not Specified field (AC-12)', () => {
    expect([...extractor.notSpecifiedFields]).toEqual(['Owning Team']);
  });

  describe('against the populated repo fixture (AC-1)', () => {
    it('finds Service Name, Repository, and Primary Language / Runtime', () => {
      expect(extractor.lookup('Service Name', POPULATED)).toEqual({
        status: 'found',
        value: 'sample-widget-service',
        evidence: 'package.json#name',
      });
      expect(extractor.lookup('Repository', POPULATED)).toEqual({
        status: 'found',
        value: 'https://example.com/sample-widget-service.git',
        evidence: 'package.json#repository',
      });
      expect(extractor.lookup('Primary Language / Runtime', POPULATED)).toEqual({
        status: 'found',
        value: 'TypeScript (Node.js)',
        evidence: 'tsconfig.json',
      });
    });

    it('finds Entry Point, Exposed CLI Commands, and Key Dependencies', () => {
      expect(extractor.lookup('Entry Point', POPULATED)).toEqual({
        status: 'found',
        value: 'dist/index.js',
        evidence: 'package.json#main',
      });
      expect(extractor.lookup('Exposed CLI Commands', POPULATED)).toEqual({
        status: 'found',
        value: 'widget-cli',
        evidence: 'package.json#bin',
      });
      expect(extractor.lookup('Key Dependencies', POPULATED)).toEqual({
        status: 'found',
        value: 'amqplib, pg, winston',
        evidence: 'package.json#dependencies',
      });
    });

    it('finds Databases, Messaging / Queues, and Logging Approach from dependencies', () => {
      expect(extractor.lookup('Databases', POPULATED)).toEqual({
        status: 'found',
        value: 'pg',
        evidence: 'package.json#dependencies',
      });
      expect(extractor.lookup('Messaging / Queues', POPULATED)).toEqual({
        status: 'found',
        value: 'amqplib',
        evidence: 'package.json#dependencies',
      });
      expect(extractor.lookup('Logging Approach', POPULATED)).toEqual({
        status: 'found',
        value: 'winston',
        evidence: 'package.json#dependencies',
      });
    });

    it('resolves "Not Found" for Third-Party Services (no matching evidence)', () => {
      expect(extractor.lookup('Third-Party Services', POPULATED)).toEqual({ status: 'not-found' });
    });

    it('finds Deployment Target and Configuration Source', () => {
      expect(extractor.lookup('Deployment Target', POPULATED)).toEqual({
        status: 'found',
        value: 'Containerized (Dockerfile present)',
        evidence: 'Dockerfile',
      });
      expect(extractor.lookup('Configuration Source', POPULATED)).toEqual({
        status: 'found',
        value: 'Environment variables (.env)',
        evidence: '.env.example',
      });
    });

    it('finds CI/CD Pipeline files sorted lexicographically (design-review Finding 4)', () => {
      expect(extractor.lookup('CI/CD Pipeline', POPULATED)).toEqual({
        status: 'found',
        value: 'ci.yml, release.yml',
        evidence: '.github/workflows',
      });
    });

    it('finds Known Limitations from the README', () => {
      const result = extractor.lookup('Known Limitations', POPULATED);
      expect(result.status).toBe('found');
      if (result.status === 'found') {
        expect(result.value).toContain('batch widget creation');
        expect(result.evidence).toBe('README.md#known-limitations');
      }
    });
  });

  describe('against the partial repo fixture (AC-15: mixed found/not-found)', () => {
    it('finds some fields from the minimal package.json', () => {
      expect(extractor.lookup('Service Name', PARTIAL)).toEqual({
        status: 'found',
        value: 'partial-sample-service',
        evidence: 'package.json#name',
      });
      expect(extractor.lookup('Primary Language / Runtime', PARTIAL)).toEqual({
        status: 'found',
        value: 'JavaScript (Node.js)',
        evidence: 'package.json',
      });
      expect(extractor.lookup('Build / Package Manager', PARTIAL)).toEqual({
        status: 'found',
        value: 'npm',
        evidence: 'package.json',
      });
    });

    it('resolves "Not Found" for fields with no evidence in this partial repo', () => {
      expect(extractor.lookup('Repository', PARTIAL)).toEqual({ status: 'not-found' });
      expect(extractor.lookup('Entry Point', PARTIAL)).toEqual({ status: 'not-found' });
      expect(extractor.lookup('Deployment Target', PARTIAL)).toEqual({ status: 'not-found' });
      expect(extractor.lookup('CI/CD Pipeline', PARTIAL)).toEqual({ status: 'not-found' });
    });
  });

  describe('against a package.json with a string-form "bin" (npm single-executable convention)', () => {
    it('resolves Entry Point to the string bin path', () => {
      expect(extractor.lookup('Entry Point', STRING_BIN)).toEqual({
        status: 'found',
        value: './cli.js',
        evidence: 'package.json#bin',
      });
    });

    it('resolves Exposed CLI Commands to the package name, per npm convention', () => {
      expect(extractor.lookup('Exposed CLI Commands', STRING_BIN)).toEqual({
        status: 'found',
        value: 'single-bin-tool',
        evidence: 'package.json#bin',
      });
    });
  });

  describe('against the empty repo fixture (AC-2)', () => {
    it('resolves every evidence-dependent field to "Not Found"', () => {
      expect(extractor.lookup('Service Name', EMPTY)).toEqual({ status: 'not-found' });
      expect(extractor.lookup('Primary Language / Runtime', EMPTY)).toEqual({
        status: 'not-found',
      });
      expect(extractor.lookup('Databases', EMPTY)).toEqual({ status: 'not-found' });
      expect(extractor.lookup('Known Limitations', EMPTY)).toEqual({ status: 'not-found' });
    });
  });
});
