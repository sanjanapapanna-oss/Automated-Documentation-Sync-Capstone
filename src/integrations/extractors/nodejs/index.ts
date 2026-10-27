import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Extractor, FieldResult } from '../../../core/types.js';

const NOT_SPECIFIED_FIELDS = new Set(['Owning Team']);

const DB_PACKAGES = [
  'pg',
  'mysql2',
  'mysql',
  'mongodb',
  'mongoose',
  'sqlite3',
  'better-sqlite3',
  'redis',
  'ioredis',
];
const SERVICE_PACKAGES = ['stripe', 'twilio', 'aws-sdk', '@aws-sdk/client-s3', '@sendgrid/mail'];
const MESSAGING_PACKAGES = ['amqplib', 'kafkajs', 'bullmq', 'bull', 'nats'];
const LOGGING_PACKAGES = ['winston', 'pino', 'bunyan', 'loglevel'];

interface PackageJson {
  name?: string;
  main?: string;
  bin?: string | Record<string, string>;
  repository?: string | { url?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readJsonSafe(filePath: string): PackageJson | undefined {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as PackageJson;
  } catch {
    return undefined;
  }
}

function readTextSafe(filePath: string): string | undefined {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

function listDirSorted(dirPath: string): string[] {
  try {
    return readdirSync(dirPath).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function dependencyNames(pkg: PackageJson | undefined): string[] {
  if (!pkg) return [];
  return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
}

function matchAny(names: string[], candidates: string[]): string[] {
  return candidates.filter((c) => names.includes(c)).sort((a, b) => a.localeCompare(b));
}

export function createNodejsExtractor(): Extractor {
  return {
    name: 'nodejs-typescript',
    notSpecifiedFields: NOT_SPECIFIED_FIELDS,

    canHandle(): boolean {
      // v1's only extractor must handle any directory, including an empty
      // repository, so FR-8(b) resolves as a successful run with "Not Found"
      // fields rather than no extractor being selected at all.
      return true;
    },

    lookup(fieldLabel: string, repoPath: string): FieldResult {
      const pkg = readJsonSafe(join(repoPath, 'package.json'));
      const deps = dependencyNames(pkg);

      switch (fieldLabel) {
        case 'Service Name': {
          const name = pkg?.name;
          return name && name.trim()
            ? { status: 'found', value: name, evidence: 'package.json#name' }
            : { status: 'not-found' };
        }

        case 'Repository': {
          const repo = pkg?.repository;
          const url = typeof repo === 'string' ? repo : repo?.url;
          return url
            ? { status: 'found', value: url, evidence: 'package.json#repository' }
            : { status: 'not-found' };
        }

        case 'Primary Language / Runtime': {
          if (existsSync(join(repoPath, 'tsconfig.json'))) {
            return { status: 'found', value: 'TypeScript (Node.js)', evidence: 'tsconfig.json' };
          }
          if (pkg) {
            return { status: 'found', value: 'JavaScript (Node.js)', evidence: 'package.json' };
          }
          return { status: 'not-found' };
        }

        case 'Entry Point': {
          if (pkg?.main && pkg.main.trim()) {
            return { status: 'found', value: pkg.main, evidence: 'package.json#main' };
          }
          if (pkg?.bin) {
            // npm allows `bin` as either a single string (the package's one
            // executable) or a map of command name -> path.
            const first = typeof pkg.bin === 'string' ? pkg.bin : Object.values(pkg.bin).sort()[0];
            if (first) return { status: 'found', value: first, evidence: 'package.json#bin' };
          }
          return { status: 'not-found' };
        }

        case 'Key Dependencies': {
          const names = Object.keys(pkg?.dependencies ?? {}).sort((a, b) => a.localeCompare(b));
          return names.length > 0
            ? { status: 'found', value: names.join(', '), evidence: 'package.json#dependencies' }
            : { status: 'not-found' };
        }

        case 'Build / Package Manager': {
          if (existsSync(join(repoPath, 'pnpm-lock.yaml'))) {
            return { status: 'found', value: 'pnpm', evidence: 'pnpm-lock.yaml' };
          }
          if (existsSync(join(repoPath, 'yarn.lock'))) {
            return { status: 'found', value: 'yarn', evidence: 'yarn.lock' };
          }
          if (existsSync(join(repoPath, 'package-lock.json'))) {
            return { status: 'found', value: 'npm', evidence: 'package-lock.json' };
          }
          if (pkg) {
            return { status: 'found', value: 'npm', evidence: 'package.json' };
          }
          return { status: 'not-found' };
        }

        case 'Exposed Endpoints / APIs': {
          const specs = ['openapi.yaml', 'openapi.yml', 'swagger.json']
            .filter((f) => existsSync(join(repoPath, f)))
            .sort((a, b) => a.localeCompare(b));
          return specs.length > 0
            ? { status: 'found', value: `OpenAPI spec: ${specs[0]}`, evidence: specs[0] as string }
            : { status: 'not-found' };
        }

        case 'Exposed CLI Commands': {
          if (pkg?.bin) {
            // A string `bin` names a single executable after the package's
            // own name, per npm convention; an object `bin` maps each
            // command name to its path.
            if (typeof pkg.bin === 'string' && pkg.name) {
              return { status: 'found', value: pkg.name, evidence: 'package.json#bin' };
            }
            if (typeof pkg.bin === 'object') {
              const names = Object.keys(pkg.bin).sort((a, b) => a.localeCompare(b));
              if (names.length > 0) {
                return {
                  status: 'found',
                  value: names.join(', '),
                  evidence: 'package.json#bin',
                };
              }
            }
          }
          return { status: 'not-found' };
        }

        case 'Databases': {
          const matches = matchAny(deps, DB_PACKAGES);
          return matches.length > 0
            ? { status: 'found', value: matches.join(', '), evidence: 'package.json#dependencies' }
            : { status: 'not-found' };
        }

        case 'Third-Party Services': {
          const matches = matchAny(deps, SERVICE_PACKAGES);
          return matches.length > 0
            ? { status: 'found', value: matches.join(', '), evidence: 'package.json#dependencies' }
            : { status: 'not-found' };
        }

        case 'Messaging / Queues': {
          const matches = matchAny(deps, MESSAGING_PACKAGES);
          return matches.length > 0
            ? { status: 'found', value: matches.join(', '), evidence: 'package.json#dependencies' }
            : { status: 'not-found' };
        }

        case 'Deployment Target': {
          return existsSync(join(repoPath, 'Dockerfile'))
            ? {
                status: 'found',
                value: 'Containerized (Dockerfile present)',
                evidence: 'Dockerfile',
              }
            : { status: 'not-found' };
        }

        case 'CI/CD Pipeline': {
          // Deterministic tie-break (design-review Finding 4): sorted
          // lexicographically, never relying on OS directory-iteration order.
          const files = listDirSorted(join(repoPath, '.github', 'workflows')).filter(
            (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
          );
          return files.length > 0
            ? { status: 'found', value: files.join(', '), evidence: '.github/workflows' }
            : { status: 'not-found' };
        }

        case 'Logging Approach': {
          const matches = matchAny(deps, LOGGING_PACKAGES);
          return matches.length > 0
            ? { status: 'found', value: matches.join(', '), evidence: 'package.json#dependencies' }
            : { status: 'not-found' };
        }

        case 'Configuration Source': {
          return existsSync(join(repoPath, '.env.example'))
            ? {
                status: 'found',
                value: 'Environment variables (.env)',
                evidence: '.env.example',
              }
            : { status: 'not-found' };
        }

        case 'Known Limitations': {
          const readme = readTextSafe(join(repoPath, 'README.md'));
          if (!readme) return { status: 'not-found' };
          const match = /##\s*(?:Known Limitations|Limitations)\s*\n+([\s\S]*?)(?:\n##\s|$)/i.exec(
            readme,
          );
          const body = match?.[1]?.trim();
          return body
            ? {
                status: 'found',
                value: body.replace(/\s*\n\s*/g, ' '),
                evidence: 'README.md#known-limitations',
              }
            : { status: 'not-found' };
        }

        default:
          return { status: 'not-found' };
      }
    },
  };
}
