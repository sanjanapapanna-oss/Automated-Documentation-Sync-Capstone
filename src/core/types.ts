export interface FieldLine {
  kind: 'field';
  label: string;
  prefix: string;
}

export interface OtherLine {
  kind: 'other';
  text: string;
}

export type TemplateLine = FieldLine | OtherLine;

export interface ParsedTemplate {
  lines: TemplateLine[];
  fieldLabels: string[];
}

export type FieldResult =
  | { status: 'found'; value: string; evidence: string }
  | { status: 'not-found' }
  | { status: 'not-specified' };

export interface Extractor {
  readonly name: string;
  readonly notSpecifiedFields: ReadonlySet<string>;
  canHandle(repoPath: string): boolean;
  lookup(fieldLabel: string, repoPath: string): FieldResult;
}

export type ResolvedField =
  | { status: 'found'; value: string; evidence: string }
  | { status: 'not-found' }
  | { status: 'not-specified' };

export interface ResolvedManifest {
  template: ParsedTemplate;
  fields: Map<string, ResolvedField>;
  foundCount: number;
  unresolvedCount: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type RunResult =
  | {
      status: 'success';
      foundFieldCount: number;
      unresolvedFieldCount: number;
      outputPath: string;
    }
  | {
      status: 'failure';
      errorCode: string;
      errorMessage: string;
    };

export class TemplateError extends Error {
  constructor(
    public readonly code: 'TEMPLATE_NOT_FOUND' | 'TEMPLATE_MALFORMED',
    message: string,
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class RepoError extends Error {
  constructor(
    public readonly code: 'REPO_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'RepoError';
  }
}

export class ConfigError extends Error {
  constructor(
    public readonly code: 'CONFIG_REJECTED_FLAG',
    message: string,
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ReplacementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReplacementError';
  }
}

export interface Config {
  templatePath: string;
  repoPath: string;
  outputPath: string;
  ciMode: boolean;
}
