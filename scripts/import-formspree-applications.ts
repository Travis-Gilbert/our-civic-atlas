import { readFile } from 'node:fs/promises';

import {
  mapFormspreeRowsToApplications,
  parseFormspreeCsv,
  type FormspreeImportCandidate,
  type FormspreeImportSubmitInput,
} from '../src/lib/civic/formspree-import';
import { PORCHFEST_EVENT_SLUG } from '../src/lib/civic/porchfest-application';

interface CliOptions {
  readonly file?: string;
  readonly endpoint?: string;
  readonly commit: boolean;
  readonly allowIncomplete: boolean;
  readonly eventSlug: string;
  readonly sourcePrefix: string;
}

interface SubmitEventApplicationResponse {
  readonly data?: {
    readonly submitEventApplication?: {
      readonly created: boolean;
      readonly duplicate: boolean;
      readonly backupRecorded: boolean;
      readonly application?: {
        readonly id: string;
        readonly sourceKey: string;
        readonly status: string;
        readonly createdAt: string | null;
      } | null;
    };
  };
  readonly errors?: readonly { readonly message: string }[];
}

const SUBMIT_EVENT_APPLICATION_MUTATION = `
mutation SubmitEventApplication($input: EventApplicationSubmitInput!) {
  submitEventApplication(input: $input) {
    application {
      id
      sourceKey
      status
      createdAt
    }
    created
    duplicate
    backupRecorded
  }
}
`;

function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    endpoint: process.env.CIVIC_ATLAS_GRAPHQL_ENDPOINT,
    commit: false,
    allowIncomplete: false,
    eventSlug: PORCHFEST_EVENT_SLUG,
    sourcePrefix: 'formspree',
  };

  const mutable: Record<string, string | boolean | undefined> = { ...options };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--commit') {
      mutable.commit = true;
      continue;
    }
    if (arg === '--dry-run') {
      mutable.commit = false;
      continue;
    }
    if (arg === '--allow-incomplete') {
      mutable.allowIncomplete = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next) {
      throw new Error(`Missing value for ${arg}`);
    }
    if (arg === '--file') {
      mutable.file = next;
    } else if (arg === '--endpoint') {
      mutable.endpoint = next;
    } else if (arg === '--event-slug') {
      mutable.eventSlug = next;
    } else if (arg === '--source-prefix') {
      mutable.sourcePrefix = next;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
    index += 1;
  }

  return mutable as unknown as CliOptions;
}

function printUsage(): void {
  console.log(`Usage:
  npm run porchfest:import-formspree -- --file /private/formspree.csv [--dry-run]
  npm run porchfest:import-formspree -- --file /private/formspree.csv --endpoint http://localhost:4000/graphql --commit

Options:
  --file              Private Formspree CSV export path. Required.
  --endpoint          GraphQL endpoint. Required with --commit unless CIVIC_ATLAS_GRAPHQL_ENDPOINT is set.
  --commit            Submit rows to GraphQL. Default is dry-run.
  --dry-run           Parse and summarize only.
  --allow-incomplete  Allow rows with missing required fields to be submitted.
  --event-slug        Event slug. Defaults to ${PORCHFEST_EVENT_SLUG}.
  --source-prefix     Source key prefix. Defaults to formspree.

Environment:
  CIVIC_ATLAS_GRAPHQL_ENDPOINT       Default GraphQL endpoint.
  CIVIC_ATLAS_GRAPHQL_AUTHORIZATION  Optional Authorization header value.
`);
}

function summarizeCandidates(candidates: readonly FormspreeImportCandidate[]): void {
  const counts = new Map<string, number>();
  let missingRows = 0;
  let droppedRows = 0;
  for (const candidate of candidates) {
    counts.set(
      candidate.submitInput.category,
      (counts.get(candidate.submitInput.category) ?? 0) + 1,
    );
    if (candidate.missingFields.length > 0) missingRows += 1;
    if (candidate.droppedKeys.length > 0) droppedRows += 1;
  }

  console.log(`Rows parsed: ${candidates.length}`);
  console.log(
    `Categories: ${Array.from(counts.entries())
      .map(([category, count]) => `${category}=${count}`)
      .join(', ')}`,
  );
  console.log(`Rows with missing required fields: ${missingRows}`);
  console.log(`Rows with unmapped populated columns: ${droppedRows}`);

  for (const candidate of candidates) {
    const issues = [
      candidate.missingFields.length > 0
        ? `missing=${candidate.missingFields.join('|')}`
        : '',
      candidate.droppedKeys.length > 0
        ? `unmapped=${candidate.droppedKeys.join('|')}`
        : '',
    ].filter(Boolean);
    if (issues.length === 0) continue;
    console.log(
      `  row ${candidate.rowNumber}: ${candidate.submitInput.category} ${redactSourceKey(candidate.submitInput.sourceKey)} ${issues.join(' ')}`,
    );
  }
}

function redactSourceKey(sourceKey: string): string {
  if (!sourceKey.includes('@')) return sourceKey;
  const [prefix] = sourceKey.split('@');
  return `${prefix.slice(0, Math.min(prefix.length, 18))}@...`;
}

function serializableInput(input: FormspreeImportSubmitInput): FormspreeImportSubmitInput {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as unknown as FormspreeImportSubmitInput;
}

async function submitCandidate(
  endpoint: string,
  candidate: FormspreeImportCandidate,
): Promise<SubmitEventApplicationResponse['data']> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  const authorization = process.env.CIVIC_ATLAS_GRAPHQL_AUTHORIZATION;
  if (authorization) headers.authorization = authorization;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: SUBMIT_EVENT_APPLICATION_MUTATION,
      variables: {
        input: serializableInput(candidate.submitInput),
      },
    }),
  });
  const payload = (await response.json()) as SubmitEventApplicationResponse;
  if (!response.ok || payload.errors?.length) {
    const detail = payload.errors?.map((error) => error.message).join('; ');
    throw new Error(
      `row ${candidate.rowNumber} failed: HTTP ${response.status}${detail ? ` ${detail}` : ''}`,
    );
  }
  return payload.data;
}

async function commitCandidates(
  endpoint: string,
  candidates: readonly FormspreeImportCandidate[],
): Promise<void> {
  let created = 0;
  let duplicates = 0;
  let backups = 0;

  for (const candidate of candidates) {
    const data = await submitCandidate(endpoint, candidate);
    const result = data?.submitEventApplication;
    if (!result) {
      throw new Error(`row ${candidate.rowNumber} returned no submitEventApplication payload`);
    }
    if (result.created) created += 1;
    if (result.duplicate) duplicates += 1;
    if (result.backupRecorded) backups += 1;
    console.log(
      `  row ${candidate.rowNumber}: ${result.created ? 'created' : 'seen'} ${redactSourceKey(result.application?.sourceKey ?? candidate.submitInput.sourceKey)}`,
    );
  }

  console.log(
    `Commit complete: created=${created}, duplicates=${duplicates}, backupRecorded=${backups}`,
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options.file) {
    printUsage();
    throw new Error('--file is required');
  }

  const csv = await readFile(options.file, 'utf8');
  const rows = parseFormspreeCsv(csv);
  const candidates = mapFormspreeRowsToApplications(rows, {
    eventSlug: options.eventSlug,
    sourcePrefix: options.sourcePrefix,
  });
  summarizeCandidates(candidates);

  const incomplete = candidates.filter((candidate) => candidate.missingFields.length > 0);
  if (options.commit && incomplete.length > 0 && !options.allowIncomplete) {
    throw new Error(
      `${incomplete.length} row(s) have missing required fields. Re-run with --allow-incomplete only after manual review.`,
    );
  }

  if (!options.commit) {
    console.log('Dry run complete: no network writes performed.');
    return;
  }
  if (!options.endpoint) {
    throw new Error('--endpoint or CIVIC_ATLAS_GRAPHQL_ENDPOINT is required with --commit');
  }
  await commitCandidates(options.endpoint, candidates);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
