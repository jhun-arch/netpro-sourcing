import { createReadStream } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@sanity/client';
import {
  buildSeedDocument,
  collectLegacyImagePaths,
  extractHomepageSeed,
} from '../src/cms/seedFromLegacy';

const projectId = '5mntophk';
const dataset = 'production';
const apiVersion = '2025-02-19';

async function main() {
  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== projectId || process.env.NEXT_PUBLIC_SANITY_DATASET !== dataset) {
    throw new Error('Seed stopped: environment must target the isolated Sanity project 5mntophk / production dataset.');
  }
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) throw new Error('Seed stopped: SANITY_API_WRITE_TOKEN is not configured.');

  const root = process.cwd();
  const [html, css] = await Promise.all([
    readFile(path.join(root, 'index.html'), 'utf8'),
    readFile(path.join(root, 'home-studio.css'), 'utf8'),
  ]);
  const seed = extractHomepageSeed(html, css);
  const imagePaths = collectLegacyImagePaths(seed);
  await Promise.all(imagePaths.map((sourcePath) => access(path.join(root, sourcePath))));

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });
  const rawClient = client.withConfig({ perspective: 'raw' });
  const existingId = await rawClient.fetch<string | null>(
    '*[_id in ["homePage", "drafts.homePage"]][0]._id',
  );
  if (existingId) {
    console.log(`Seed skipped: ${existingId} already exists. Existing editor content was left untouched.`);
    return;
  }

  const refs: Record<string, string> = {};
  for (const sourcePath of imagePaths) {
    const absolutePath = path.join(root, sourcePath);
    const asset = await client.assets.upload('image', createReadStream(absolutePath), {
      filename: path.basename(sourcePath),
    });
    refs[sourcePath] = asset._id;
  }

  const document = buildSeedDocument(seed, refs);
  const result = await client.createIfNotExists(document);
  console.log(`Seed complete: ${result._id}. Source snapshot imported with createIfNotExists; existing documents are never replaced.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure.';
  console.error(`Homepage seed failed: ${message}`);
  process.exitCode = 1;
});
