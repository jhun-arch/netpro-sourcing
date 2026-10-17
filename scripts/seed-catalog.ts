import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import legacyCatalogJson from '../src/catalog/legacy-catalog.json';
import { buildCatalogSeedDocuments, catalogSeedDocumentIds, collectCatalogImagePaths } from '../src/catalog/seed';
import type { LegacyCatalog } from '../src/catalog/types';

const projectId = '5mntophk';
const dataset = 'production';
const apiVersion = '2025-02-19';
const legacyCatalog = legacyCatalogJson as LegacyCatalog;

type SeedSnapshotDocument = {
  _id: string;
  _type: string;
  [field: string]: unknown;
};

type SeedImageAsset = { _id: string; sha1hash: string };

function expectedCatalogTypes(): Map<string, string> {
  return new Map([
    ...legacyCatalog.categories.map((category) => [`catalog-category-${category.id}`, 'productCategory'] as const),
    ...legacyCatalog.products.map((product) => [`catalog-product-${product.id}`, 'product'] as const),
    ...legacyCatalog.styles.flatMap((category) => category.entries.map((entry) => [`catalog-style-${entry.slug}`, 'catalogStyle'] as const)),
  ]);
}

function assertSeedTargetEnvironment(): void {
  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== projectId || process.env.NEXT_PUBLIC_SANITY_DATASET !== dataset) {
    throw new Error('Seed stopped: the environment must target the isolated experiment project and dataset.');
  }
}

function assertExistingDocumentTypes(documents: SeedSnapshotDocument[]): void {
  const expectedTypes = expectedCatalogTypes();
  for (const document of documents) {
    if (document._id === 'homePage' || document._id === 'drafts.homePage') {
      if (document._type !== 'homePage') throw new Error('Seed stopped: the homepage identity has an unexpected document type.');
      continue;
    }
    const id = document._id.replace(/^drafts\./, '');
    const expectedType = expectedTypes.get(id);
    if (expectedType && document._type !== expectedType) {
      throw new Error(`Seed stopped: ${id} already exists with a different document type.`);
    }
  }
}

async function writeSeedBackup(root: string, documents: SeedSnapshotDocument[]): Promise<string> {
  const output = path.resolve(root, 'output');
  await mkdir(output, { recursive: true });
  const capturedAt = new Date().toISOString();
  const fileName = `catalog-seed-backup-${capturedAt.replace(/[:.]/g, '-')}-${randomUUID()}.json`;
  const backupPath = path.join(output, fileName);
  await writeFile(backupPath, JSON.stringify({
    target: { projectId, dataset },
    capturedAt,
    note: 'Read-only snapshot created before catalog asset uploads or document creation.',
    documents,
  }, null, 2), { encoding: 'utf8', flag: 'wx' });
  return backupPath;
}

async function sha1File(filePath: string): Promise<string> {
  return createHash('sha1').update(await readFile(filePath)).digest('hex');
}

async function applyCatalogSeed(): Promise<void> {
  assertSeedTargetEnvironment();
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) throw new Error('Seed stopped: the server-side Sanity write token is not configured.');

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });
  const rawClient = client.withConfig({ perspective: 'raw' });
  const ids = catalogSeedDocumentIds(legacyCatalog);
  const trackedIds = [...ids, ...ids.map((id) => `drafts.${id}`), 'homePage', 'drafts.homePage'];
  const existingDocuments = await rawClient.fetch<SeedSnapshotDocument[]>(
    '*[_id in $ids]',
    { ids: trackedIds },
  );
  assertExistingDocumentTypes(existingDocuments);
  const existingIds = existingDocuments.map((document) => document._id);
  const existing = new Set(existingIds);
  const missingCount = ids.filter((id) => !existing.has(id) && !existing.has(`drafts.${id}`)).length;
  if (!missingCount) {
    console.log('Seed skipped: every catalog document already exists. Existing content was left untouched.');
    return;
  }

  const root = process.cwd();
  const imagePaths = collectCatalogImagePaths(legacyCatalog, existing);
  const backupPath = await writeSeedBackup(root, existingDocuments);
  const sourceFiles = await Promise.all(imagePaths.map(async (sourcePath) => {
    const absolutePath = path.resolve(root, sourcePath);
    await access(absolutePath);
    return {
      sourcePath,
      absolutePath,
      sha1hash: await sha1File(absolutePath),
    };
  }));

  const refs: Record<string, string> = {};
  const hashes = [...new Set(sourceFiles.map((file) => file.sha1hash))];
  const existingAssets = hashes.length
    ? await rawClient.fetch<SeedImageAsset[]>(
      '*[_type == "sanity.imageAsset" && sha1hash in $hashes] | order(_createdAt asc, _id asc) { _id, sha1hash }',
      { hashes },
    )
    : [];
  const assetIdByHash = new Map<string, string>();
  for (const asset of existingAssets) {
    if (!assetIdByHash.has(asset.sha1hash)) assetIdByHash.set(asset.sha1hash, asset._id);
  }
  for (const source of sourceFiles) {
    let assetId = assetIdByHash.get(source.sha1hash);
    if (!assetId) {
      const asset = await client.assets.upload('image', createReadStream(source.absolutePath), {
        filename: path.basename(source.sourcePath),
      });
      assetId = asset._id;
      assetIdByHash.set(source.sha1hash, assetId);
    }
    refs[source.sourcePath] = assetId;
  }

  const documents = buildCatalogSeedDocuments(legacyCatalog, refs, existing);
  const transaction = client.transaction();
  for (const document of documents) {
    transaction.createIfNotExists(document as Parameters<typeof transaction.createIfNotExists>[0]);
  }
  await transaction.commit();
  console.log(`Seed complete: created ${documents.length} missing catalog documents using createIfNotExists; existing published and draft documents were untouched. Pre-write backup: ${path.relative(root, backupPath)}.`);
}

async function main(): Promise<void> {
  if (!process.argv.includes('--apply')) {
    const images = collectCatalogImagePaths(legacyCatalog);
    console.log(`Dry run only: ${legacyCatalog.products.length} products, ${legacyCatalog.categories.length} categories, ${legacyCatalog.styles.reduce((sum, category) => sum + category.entries.length, 0)} style cards, and ${images.length} unique image files. No Sanity connection or writes were made. Pass --apply only after confirming the isolated experiment target.`);
    return;
  }
  await applyCatalogSeed();
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('Catalog seed stopped. Review the target configuration and local source files; no credentials are printed.');
    process.exitCode = 1;
  });
}
