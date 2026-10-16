import { createClient } from '@sanity/client';
import { findMissingArrayItemTypes } from '../src/cms/arrayItemTypes';

const PROJECT_ID = '5mntophk';
const DATASET = 'production';
const API_VERSION = '2025-02-19';
const DOCUMENT_IDS = ['homePage', 'drafts.homePage'] as const;

type HomeDocument = Record<string, unknown> & {
  _id: string;
  _rev: string;
  _type: 'homePage';
};

function readMode(args: string[]): boolean {
  if (args.length === 0) return false;
  if (args.length === 1 && args[0] === '--apply') return true;
  throw new Error('Usage: tsx scripts/repair-home-array-types.ts [--apply]');
}

async function main() {
  const apply = readMode(process.argv.slice(2));
  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== PROJECT_ID
    || process.env.NEXT_PUBLIC_SANITY_DATASET !== DATASET) {
    throw new Error('Refusing to run: environment must target the isolated homepage experiment project and dataset.');
  }
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) throw new Error('SANITY_API_WRITE_TOKEN is required to inspect and repair the experiment dataset.');

  const client = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    useCdn: false,
    perspective: 'raw',
    token,
  });
  const documents = await client.fetch<HomeDocument[]>(
    '*[_id in $documentIds && _type == "homePage"]',
    { documentIds: [...DOCUMENT_IDS] },
  );
  if (documents.length === 0) {
    throw new Error('No published or draft homePage singleton was found in the isolated dataset.');
  }

  if (documents.some((document) => !DOCUMENT_IDS.includes(document._id as (typeof DOCUMENT_IDS)[number]))) {
    throw new Error('Refusing to continue: query returned an unexpected document ID.');
  }

  const plans = documents.map((document) => ({
    document,
    repairs: findMissingArrayItemTypes(document, document._id),
  }));
  const repairCount = plans.reduce((count, plan) => count + plan.repairs.length, 0);

  if (!apply) {
    console.log(`Dry run: ${repairCount} missing array item _type value(s) across ${plans.length} homepage document(s).`);
    for (const { document, repairs } of plans) {
      console.log(`${document._id} @ ${document._rev}: ${repairs.length} repair(s)`);
      for (const repair of repairs) console.log(`  ${repair.patchPath} = ${repair.expectedType}`);
    }
    console.log('No content was changed. Pass --apply to patch only these missing _type fields.');
    return;
  }

  for (const { document, repairs } of plans) {
    if (repairs.length === 0) continue;
    const fields = Object.fromEntries(repairs.map(({ patchPath, expectedType }) => [patchPath, expectedType]));
    await client.patch(document._id).ifRevisionId(document._rev).set(fields).commit();
    console.log(`Repaired ${repairs.length} missing array item _type value(s) in ${document._id}.`);
  }
  console.log(`Applied ${repairCount} field-level repair(s).`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown repair failure.';
  console.error(`Homepage array type repair failed: ${message}`);
  process.exitCode = 1;
});
