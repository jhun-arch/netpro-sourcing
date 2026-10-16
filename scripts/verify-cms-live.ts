import { randomUUID } from 'node:crypto';
import { access, mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { createClient, type PublishAction } from '@sanity/client';
import { urlSearchParamPreviewPathname, urlSearchParamPreviewSecret } from '@sanity/preview-url-secret';
import { createPreviewSecret } from '@sanity/preview-url-secret/create-secret';
import { load } from 'cheerio';
import type { HomePageDocument, SanityImage } from '../src/cms/types';

const PROJECT_ID = '5mntophk';
const DATASET = 'production';
const API_VERSION = '2025-02-19';
const PUBLISHED_ID = 'homePage';
const DRAFT_ID = 'drafts.homePage';
const EXPECTED_ORIGIN = 'http://localhost:3000';
const EXPERIMENT_PREVIEW_ORIGIN = 'https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app';
const ASSET_RELATIVE_PATH = 'assets/about-product-detail-v4.webp';
const TEST_TITLE = 'CMS Draft Verification';
const SECRET_SOURCE = 'netpro-nextjs-sanity-live-verification';
const outputDirectory = resolve(process.cwd(), 'output');
const statePath = resolve(outputDirectory, 'cms-live-state.json');
const cookiesPath = resolve(outputDirectory, 'cms-preview-cookies.json');
const reportPath = resolve(outputDirectory, 'cms-live-report.json');

type AnyRecord = Record<string, unknown>;
type LiveDocument = Omit<HomePageDocument, '_id'> & { _id: string };
type DraftDocument = AnyRecord & { _id: typeof DRAFT_ID; _type: 'homePage' };
type BrowserCookie = {
  name: string;
  value: string;
  url: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};
type PageSnapshot = {
  status: number;
  titleLines: string[];
  heroImageUrl: string;
  heroAssetHash: string;
};
type LiveState = {
  schemaVersion: 1;
  runId: string;
  projectId: string;
  dataset: string;
  origin: string;
  status: 'preparing' | 'prepared' | 'finishing' | 'finished';
  stage: string;
  startedAt: string;
  originalPublishedRevision: string;
  originalPublishedDocument: LiveDocument;
  originalTitleLines: string[];
  firstSlideKey: string;
  originalFirstImage: SanityImage;
  testTitleLine: string;
  assetFilename: string;
  assetId?: string;
  draftRevision?: string;
  secretDocumentId: string;
  secretRevision?: string;
  secretExpiresAt?: string;
  previewCookieNames?: string[];
  preparedAt?: string;
  publishedTestRevision?: string;
  restoredRevision?: string;
  finishedAt?: string;
};

class LiveCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LiveCheckError';
  }
}

function fail(message: string): never {
  throw new LiveCheckError(message);
}

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value) fail(`${label} is missing or invalid.`);
  return value;
}

function parseArguments(argv: string[]): { mode: 'prepare' | 'finish'; origin: string } {
  const [mode, flag, origin, ...extra] = argv;
  if ((mode !== 'prepare' && mode !== 'finish') || flag !== '--origin' || !origin || extra.length) {
    fail('Usage: node --env-file=.env.local --import tsx scripts/verify-cms-live.ts prepare|finish --origin http://localhost:3000');
  }
  return { mode, origin: validateOrigin(origin) };
}

function validateOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return fail('Origin must be an absolute URL.');
  }
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    fail('Origin must contain only an approved origin, without credentials, path, query, or fragment.');
  }
  if (parsed.origin === EXPECTED_ORIGIN) return parsed.origin;
  if (parsed.origin === EXPERIMENT_PREVIEW_ORIGIN) return parsed.origin;

  fail(`Origin must be ${EXPECTED_ORIGIN} or the exact experiment Preview origin ${EXPERIMENT_PREVIEW_ORIGIN}.`);
}

function createClients() {
  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== PROJECT_ID
    || process.env.NEXT_PUBLIC_SANITY_DATASET !== DATASET) {
    fail('Refusing to run: Sanity environment does not match the isolated experiment project and dataset.');
  }
  const writeToken = process.env.SANITY_API_WRITE_TOKEN;
  const readToken = process.env.SANITY_API_READ_TOKEN;
  if (!writeToken || !readToken) {
    fail('Both server-only Sanity write and read tokens are required.');
  }
  const writeClient = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    useCdn: false,
    perspective: 'raw',
    token: writeToken,
  });
  const publishedClient = writeClient.withConfig({ perspective: 'published', useCdn: false });
  return { writeClient, publishedClient, readToken };
}

async function readPublished(client: ReturnType<typeof createClients>['publishedClient']): Promise<LiveDocument> {
  const document = await client.fetch<LiveDocument | null>(
    '*[_id == $id && _type == "homePage"][0]',
    { id: PUBLISHED_ID },
    { cache: 'no-store' },
  );
  if (!document) fail('The published homePage singleton is missing.');
  return document;
}

async function readDraft(client: ReturnType<typeof createClients>['writeClient']): Promise<LiveDocument | null> {
  return client.fetch<LiveDocument | null>(
    '*[_id == $id && _type == "homePage"][0]',
    { id: DRAFT_ID },
    { cache: 'no-store' },
  );
}

function assetId(image: SanityImage): string {
  const id = image.asset?._ref ?? image.asset?._id;
  return requireString(id, 'Homepage image asset reference');
}

function assetHash(id: string): string {
  const match = /^image-([a-f\d]+)-\d+x\d+-[a-z\d]+$/i.exec(id);
  if (!match?.[1]) fail('Image asset ID has an unsupported format.');
  return match[1].toLowerCase();
}

function documentReferencesAsset(document: unknown, id: string): boolean {
  if (Array.isArray(document)) return document.some((item) => documentReferencesAsset(item, id));
  if (!isRecord(document)) return false;
  if (isRecord(document.asset) && (document.asset._ref === id || document.asset._id === id)) return true;
  return Object.values(document).some((value) => documentReferencesAsset(value, id));
}

function cleanTitleLines(document: LiveDocument): string[] {
  const lines = document.hero?.titleLines;
  if (!Array.isArray(lines) || lines.length < 2 || lines.some((line) => typeof line !== 'string')) {
    fail('Published homepage hero title lines are invalid.');
  }
  return [...lines];
}

function pageSnapshot(html: string, status: number, origin: string): PageSnapshot {
  const $ = load(html);
  const titleLines = $('#hero-title > span').toArray().map((node) => $(node).text());
  const heroImageUrl = $('.hero-slides img.hero-photo').first().attr('src');
  if (!titleLines.length || !heroImageUrl) fail('Homepage response is missing its hero title or image.');

  let imageUrl: URL;
  try {
    imageUrl = new URL(heroImageUrl, origin);
  } catch {
    return fail('Homepage hero image URL is invalid.');
  }
  if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'cdn.sanity.io') {
    fail('Homepage hero image does not use the Sanity CDN.');
  }
  const match = /\/images\/5mntophk\/production\/([a-f\d]+)-/i.exec(imageUrl.pathname);
  if (!match?.[1]) fail('Homepage hero image URL is not for the locked experiment dataset.');
  return { status, titleLines, heroImageUrl: imageUrl.toString(), heroAssetHash: match[1].toLowerCase() };
}

async function fetchHomepage(origin: string, cookies?: readonly BrowserCookie[]): Promise<PageSnapshot> {
  const headers = cookies?.length ? { cookie: cookies.map(({ name, value }) => `${name}=${value}`).join('; ') } : undefined;
  const response = await fetch(new URL('/', origin), {
    cache: 'no-store',
    redirect: 'manual',
    ...(headers ? { headers } : {}),
  });
  if (response.status !== 200) fail(`Homepage request returned HTTP ${response.status}.`);
  return pageSnapshot(await response.text(), response.status, origin);
}

function assertPageMatches(
  page: PageSnapshot,
  titleLines: readonly string[],
  imageId: string,
  label: string,
): void {
  if (JSON.stringify(page.titleLines) !== JSON.stringify(titleLines)) {
    fail(`${label} hero title did not match the expected CMS content.`);
  }
  if (page.heroAssetHash !== assetHash(imageId)) {
    fail(`${label} hero image did not match the expected Sanity asset.`);
  }
}

async function verifyImageReachable(page: PageSnapshot): Promise<number> {
  const response = await fetch(page.heroImageUrl, { method: 'HEAD', redirect: 'follow' });
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || (contentType && !contentType.toLowerCase().startsWith('image/'))) {
    fail(`Sanity CDN image check returned HTTP ${response.status} or a non-image content type.`);
  }
  return response.status;
}

function parseSetCookieLines(lines: string[], origin: string): BrowserCookie[] {
  const cookiesByName = new Map<string, BrowserCookie>();
  for (const line of lines) {
    const semicolon = line.indexOf(';');
    const pair = (semicolon < 0 ? line : line.slice(0, semicolon)).trim();
    const equals = pair.indexOf('=');
    if (equals <= 0) fail('Draft handshake returned an invalid Set-Cookie header.');
    const name = pair.slice(0, equals).trim();
    const value = pair.slice(equals + 1);
    const attributes = new Map<string, string>();
    for (const attribute of (semicolon < 0 ? [] : line.slice(semicolon + 1).split(';'))) {
      const [rawName, ...rawValue] = attribute.trim().split('=');
      if (rawName) attributes.set(rawName.toLowerCase(), rawValue.join('='));
    }
    const cookie: BrowserCookie = {
      name,
      value,
      url: origin,
      path: attributes.get('path') || '/',
      httpOnly: attributes.has('httponly'),
      secure: attributes.has('secure'),
    };
    const expires = attributes.get('expires');
    if (expires) {
      const timestamp = Date.parse(expires);
      if (Number.isFinite(timestamp)) cookie.expires = Math.floor(timestamp / 1000);
    }
    const sameSite = attributes.get('samesite')?.toLowerCase();
    if (sameSite === 'strict') cookie.sameSite = 'Strict';
    if (sameSite === 'lax') cookie.sameSite = 'Lax';
    if (sameSite === 'none') cookie.sameSite = 'None';
    // Next.js may return an empty variant cookie as part of its normal draft handshake.
    // It has no browser value and must not be replayed as a request cookie.
    if (!value) continue;
    cookiesByName.set(name, cookie);
  }
  return [...cookiesByName.values()];
}

async function writeJsonNew(path: string, value: unknown): Promise<void> {
  const file = await open(path, 'wx', 0o600);
  try {
    await file.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  } finally {
    await file.close();
  }
}

async function replaceJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  await rename(temporary, path);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureNoPriorRunFiles(): Promise<void> {
  const existing = (await Promise.all([statePath, cookiesPath, reportPath].map(pathExists)))
    .map((exists, index) => exists ? basename([statePath, cookiesPath, reportPath][index]!) : null)
    .filter(Boolean);
  if (existing.length) fail(`A prior live-check output already exists (${existing.join(', ')}); preserve it and finish or archive it before another prepare.`);
}

async function verifyOutputDirectory(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const directoryInfo = await stat(outputDirectory);
  if (!directoryInfo.isDirectory()) fail('Ignored output path is not a directory.');
}

async function verifyAppReadTokenConfigured(readToken: string): Promise<void> {
  // The value is used only to verify local configuration; it is never included in output or state.
  if (!readToken) fail('Server-only Sanity read token is not configured.');
}

function withoutSystemMetadata(document: LiveDocument): AnyRecord {
  const copy = structuredClone(document) as unknown as AnyRecord;
  delete copy._id;
  delete copy._rev;
  delete copy._createdAt;
  delete copy._updatedAt;
  delete copy._system;
  return copy;
}

function makeDraftDocument(published: LiveDocument, asset: AnyRecord): DraftDocument {
  const draft = withoutSystemMetadata(published);
  const hero = draft.hero;
  if (!isRecord(hero) || !Array.isArray(hero.titleLines) || !Array.isArray(hero.slides)) {
    fail('Published homepage does not contain the expected hero fields.');
  }
  hero.titleLines = [TEST_TITLE, ...hero.titleLines.slice(1) as string[]];
  const firstSlide = hero.slides[0];
  if (!isRecord(firstSlide)) fail('Published homepage has no first hero slide.');
  firstSlide.image = {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
    alt: 'Live CMS verification image',
  };
  return { ...draft, _id: DRAFT_ID, _type: 'homePage' } as DraftDocument;
}

function createState(published: LiveDocument, origin: string, runId: string): LiveState {
  const firstSlide = published.hero.slides[0];
  if (!firstSlide?._key || !firstSlide.image) fail('Published homepage first hero slide is incomplete.');
  const originalTitleLines = cleanTitleLines(published);
  if (originalTitleLines[0] === TEST_TITLE) {
    fail('The published hero already uses the reserved CMS verification title; refusing ambiguous restore.');
  }
  return {
    schemaVersion: 1,
    runId,
    projectId: PROJECT_ID,
    dataset: DATASET,
    origin,
    status: 'preparing',
    stage: 'baseline-saved',
    startedAt: new Date().toISOString(),
    originalPublishedRevision: published._rev,
    originalPublishedDocument: published,
    originalTitleLines,
    firstSlideKey: firstSlide._key,
    originalFirstImage: structuredClone(firstSlide.image),
    testTitleLine: TEST_TITLE,
    assetFilename: ASSET_RELATIVE_PATH,
    secretDocumentId: `drafts.cms-home-live-${runId}`,
  };
}

async function readSecretMetadata(client: ReturnType<typeof createClients>['writeClient'], id: string) {
  return client.fetch<{
    _id: string;
    _rev: string;
    _type: string;
    source: string;
    studioUrl: string;
  } | null>(
    '*[_id == $id && _type == "sanity.previewUrlSecret"][0]{_id,_rev,_type,source,studioUrl}',
    { id },
    { cache: 'no-store' },
  );
}

async function performPrepare(origin: string): Promise<void> {
  await verifyOutputDirectory();
  await ensureNoPriorRunFiles();
  const { writeClient, publishedClient, readToken } = createClients();
  await verifyAppReadTokenConfigured(readToken);

  const published = await readPublished(publishedClient);
  if (await readDraft(writeClient)) {
    fail('drafts.homePage already exists. Prepare will not modify or replace another editor’s draft.');
  }

  const initialPage = await fetchHomepage(origin);
  const originalTitleLines = cleanTitleLines(published);
  const originalImageId = assetId(published.hero.slides[0]!.image);
  assertPageMatches(initialPage, originalTitleLines, originalImageId, 'Published page before prepare');

  const sourcePath = resolve(process.cwd(), ASSET_RELATIVE_PATH);
  const sourceInfo = await stat(sourcePath).catch(() => null);
  if (!sourceInfo?.isFile()) fail(`Tracked test image is missing: ${ASSET_RELATIVE_PATH}.`);

  const runId = randomUUID();
  const state = createState(published, origin, runId);
  await writeJsonNew(statePath, state);

  const asset = await writeClient.assets.upload('image', await readFile(sourcePath), {
    filename: basename(ASSET_RELATIVE_PATH),
    contentType: 'image/webp',
  });
  const newAssetId = requireString(asset._id, 'Uploaded Sanity image ID');
  if (documentReferencesAsset(published, newAssetId)) {
    fail('The uploaded test image asset is already referenced by the published homepage.');
  }
  state.assetId = newAssetId;
  state.stage = 'test-asset-uploaded';
  await replaceJson(statePath, state);

  const draft = makeDraftDocument(published, asset as unknown as AnyRecord);
  const createdDraft = await writeClient.create(draft);
  if (createdDraft._id !== DRAFT_ID || createdDraft._type !== 'homePage') {
    fail('Sanity did not create the expected homepage draft.');
  }
  state.draftRevision = createdDraft._rev;
  state.stage = 'test-draft-created';
  await replaceJson(statePath, state);

  const secretId = `cms-home-live-${runId}`;
  const secretDocumentId = `drafts.${secretId}`;
  if (secretDocumentId !== state.secretDocumentId) fail('Preview secret document ID did not match this test run.');
  if (await readSecretMetadata(writeClient, secretDocumentId)) {
    fail('The generated preview-secret document ID already exists; refusing to replace it.');
  }
  const studioUrl = `${origin}/studio`;
  let previewSecret = '';
  const secretResult = await createPreviewSecret(writeClient, SECRET_SOURCE, studioUrl, undefined, secretId);
  previewSecret = secretResult.secret;
  const secretMetadata = await readSecretMetadata(writeClient, secretDocumentId);
  if (!secretMetadata || secretMetadata.source !== SECRET_SOURCE || secretMetadata.studioUrl !== studioUrl) {
    previewSecret = '';
    fail('The official preview secret record could not be verified.');
  }
  state.secretRevision = secretMetadata._rev;
  state.secretExpiresAt = secretResult.expiresAt.toISOString();
  state.stage = 'preview-secret-created';
  await replaceJson(statePath, state);

  const handshakeUrl = new URL('/api/draft-mode/enable', origin);
  handshakeUrl.searchParams.set(urlSearchParamPreviewSecret, previewSecret);
  handshakeUrl.searchParams.set(urlSearchParamPreviewPathname, '/');
  const handshake = await fetch(handshakeUrl, { redirect: 'manual', cache: 'no-store' });
  previewSecret = '';
  if (handshake.status < 300 || handshake.status >= 400 || !handshake.headers.get('location')) {
    fail(`Official draft-mode handshake returned HTTP ${handshake.status}.`);
  }
  const setCookieLines = handshake.headers.getSetCookie();
  const browserCookies = parseSetCookieLines(setCookieLines, origin);
  if (!browserCookies.some((cookie) => cookie.name === '__prerender_bypass')) {
    fail('Official draft-mode handshake did not return the Next.js draft cookie.');
  }
  await writeJsonNew(cookiesPath, {
    origin,
    createdAt: new Date().toISOString(),
    cookies: browserCookies,
  });
  state.previewCookieNames = browserCookies.map(({ name }) => name);
  state.stage = 'preview-cookies-saved';
  await replaceJson(statePath, state);

  const anonymousPage = await fetchHomepage(origin);
  assertPageMatches(anonymousPage, originalTitleLines, originalImageId, 'Anonymous page during draft verification');

  const previewPage = await fetchHomepage(origin, browserCookies);
  const testTitleLines = [TEST_TITLE, ...originalTitleLines.slice(1)];
  assertPageMatches(previewPage, testTitleLines, newAssetId, 'Authenticated draft preview');
  const previewImageStatus = await verifyImageReachable(previewPage);

  state.status = 'prepared';
  state.stage = 'draft-preview-verified';
  state.preparedAt = new Date().toISOString();
  await replaceJson(statePath, state);
  await writeJsonNew(reportPath, {
    schemaVersion: 1,
    runId,
    projectId: PROJECT_ID,
    dataset: DATASET,
    origin,
    status: 'prepared',
    publishedBefore: {
      revision: state.originalPublishedRevision,
      heroTitleLines: originalTitleLines,
      firstHeroAssetId: originalImageId,
      anonymousPageH1Matched: true,
    },
    draftPreview: {
      draftId: DRAFT_ID,
      revision: state.draftRevision,
      heroTitleLines: testTitleLines,
      firstHeroAssetId: newAssetId,
      authenticatedPageH1Matched: true,
      anonymousPageStayedPublished: true,
      imageHttpStatus: previewImageStatus,
      previewCookieNames: state.previewCookieNames,
      cookieFile: basename(cookiesPath),
      previewSecretDocumentId: secretDocumentId,
      previewSecretExpiresAt: state.secretExpiresAt,
      previewSecretValueStored: false,
    },
    preparedAt: state.preparedAt,
  });
  console.log(`CMS live prepare complete for ${PROJECT_ID}/${DATASET} at ${origin}.`);
  console.log(`Authenticated draft preview passed; browser cookies are in ignored output/${basename(cookiesPath)}.`);
  console.log(`Temporary preview secret expires at ${state.secretExpiresAt}; only its document ID is recorded.`);
}

async function readSavedState(origin: string): Promise<LiveState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(statePath, 'utf8'));
  } catch {
    return fail('Saved CMS live-check state is missing or invalid; refusing to continue.');
  }
  if (!isRecord(parsed)
    || parsed.schemaVersion !== 1
    || parsed.projectId !== PROJECT_ID
    || parsed.dataset !== DATASET
    || parsed.origin !== origin
    || (parsed.status !== 'prepared' && parsed.status !== 'finishing')
    || !isRecord(parsed.originalPublishedDocument)) {
    fail('Saved state does not match an unfinished prepare for this isolated project and origin.');
  }
  return parsed as unknown as LiveState;
}

async function readSavedCookies(origin: string): Promise<BrowserCookie[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(cookiesPath, 'utf8'));
  } catch {
    return fail('Saved preview cookies are missing or invalid; refusing to publish.');
  }
  if (!isRecord(parsed) || parsed.origin !== origin || !Array.isArray(parsed.cookies)) {
    fail('Saved preview cookies do not match this test origin.');
  }
  const allCookies = parsed.cookies;
  if (allCookies.some((value) => !isRecord(value)
    || typeof value.name !== 'string'
    || typeof value.value !== 'string'
    || value.url !== origin)) {
    fail('Saved preview cookies contain an invalid entry or unexpected origin.');
  }
  const cookies = (allCookies as BrowserCookie[]).filter((cookie) => cookie.value.length > 0);
  if (!cookies.some((cookie) => cookie.name === '__prerender_bypass')) {
    fail('Saved preview cookies do not contain a non-empty Next.js draft-mode cookie.');
  }
  return cookies;
}

async function readSavedCookiesIfPresent(origin: string): Promise<BrowserCookie[] | null> {
  if (!(await pathExists(cookiesPath))) return null;
  return readSavedCookies(origin);
}

async function pollPublished(
  client: ReturnType<typeof createClients>['publishedClient'],
  check: (document: LiveDocument) => boolean,
  label: string,
): Promise<LiveDocument> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const document = await readPublished(client);
    if (check(document)) return document;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 750));
  }
  fail(`${label} was not visible from the published Sanity perspective within 60 seconds.`);
}

function matchesTestDocument(document: LiveDocument | DraftDocument, state: LiveState): boolean {
  if (!state.assetId) return false;
  const expected = withoutSystemMetadata(state.originalPublishedDocument);
  const expectedHero = expected.hero;
  if (!isRecord(expectedHero) || !Array.isArray(expectedHero.titleLines) || !Array.isArray(expectedHero.slides)) return false;
  expectedHero.titleLines = [state.testTitleLine, ...expectedHero.titleLines.slice(1) as string[]];
  const firstSlide = expectedHero.slides.find((slide) => isRecord(slide) && slide._key === state.firstSlideKey);
  if (!isRecord(firstSlide)) return false;
  firstSlide.image = {
    _type: 'image',
    asset: { _type: 'reference', _ref: state.assetId },
    alt: 'Live CMS verification image',
  };
  return canonicalJson(withoutSystemMetadata(document as LiveDocument)) === canonicalJson(expected);
}

function matchesOriginalDocument(document: LiveDocument, state: LiveState): boolean {
  return canonicalJson(withoutSystemMetadata(document))
    === canonicalJson(withoutSystemMetadata(state.originalPublishedDocument));
}

function canonicalJson(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (!isRecord(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map((key) => [key, normalize(item[key])]));
  };
  return JSON.stringify(normalize(value));
}

async function pollHomepage(
  origin: string,
  titleLines: readonly string[],
  imageId: string,
  label: string,
): Promise<PageSnapshot> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const page = await fetchHomepage(origin);
      assertPageMatches(page, titleLines, imageId, label);
      return page;
    } catch {
      // A published Sanity revision can take a short time to reach the HTTP renderer/CDN.
      // Retry transient HTTP, parse, and not-yet-propagated content failures without logging response data.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 750));
  }
  fail(`${label} was not visible from the HTTP homepage within 60 seconds.`);
}

async function disableSavedPreviewSession(origin: string, cookies: readonly BrowserCookie[]): Promise<number> {
  const response = await fetch(new URL('/api/draft-mode/disable', origin), {
    headers: { cookie: cookies.map(({ name, value }) => `${name}=${value}`).join('; ') },
    redirect: 'manual',
    cache: 'no-store',
  });
  if (response.status !== 303) fail(`Draft-mode disable returned HTTP ${response.status}.`);
  await rm(cookiesPath, { force: true });
  return response.status;
}

async function cleanupPreviewSecret(
  client: ReturnType<typeof createClients>['writeClient'],
  state: LiveState,
): Promise<'deleted' | 'already-absent'> {
  const secret = await readSecretMetadata(client, state.secretDocumentId);
  if (!secret) return 'already-absent';
  if (secret._rev !== state.secretRevision || secret._type !== 'sanity.previewUrlSecret'
    || secret.source !== SECRET_SOURCE || secret.studioUrl !== `${state.origin}/studio`) {
    fail('Temporary preview secret no longer matches this run; refusing to delete it.');
  }
  await client.delete({
    query: '*[_id == $id && _rev == $revision && _type == "sanity.previewUrlSecret" && source == $source && studioUrl == $studioUrl]',
    params: {
      id: state.secretDocumentId,
      revision: state.secretRevision,
      source: SECRET_SOURCE,
      studioUrl: `${state.origin}/studio`,
    },
  }, { returnDocuments: false });
  if (await readSecretMetadata(client, state.secretDocumentId)) {
    fail('Temporary preview secret cleanup did not remove this run’s own secret record.');
  }
  return 'deleted';
}

async function performFinish(origin: string): Promise<void> {
  const state = await readSavedState(origin);
  const previousReport = JSON.parse(await readFile(reportPath, 'utf8')) as AnyRecord;
  if (!isRecord(previousReport) || previousReport.runId !== state.runId
    || (previousReport.status !== 'prepared' && previousReport.status !== 'finished')) {
    fail('Saved prepare report does not match this run; refusing to continue.');
  }
  const { writeClient, publishedClient } = createClients();
  if (!state.assetId || !state.draftRevision || !state.secretRevision || !state.secretExpiresAt) {
    fail('Saved prepare state is incomplete; refusing to publish or restore.');
  }

  const publishedBefore = await readPublished(publishedClient);
  const draftBefore = await readDraft(writeClient);
  const originalRevisionStillPublished = publishedBefore._rev === state.originalPublishedRevision
    && matchesOriginalDocument(publishedBefore, state);
  const testDocumentPublished = matchesTestDocument(publishedBefore, state);
  const originalContentRestored = publishedBefore._rev !== state.originalPublishedRevision
    && matchesOriginalDocument(publishedBefore, state);
  const expectedDraftPresent = Boolean(draftBefore
    && draftBefore._rev === state.draftRevision
    && matchesTestDocument(draftBefore, state));

  let phase: 'publish' | 'test-published' | 'restored';
  if (state.status === 'prepared') {
    if (!originalRevisionStillPublished || !expectedDraftPresent) {
      fail('Published homepage or verification draft changed after prepare; refusing to overwrite concurrent content.');
    }
    phase = 'publish';
  } else if (testDocumentPublished && !draftBefore) {
    if (state.publishedTestRevision && publishedBefore._rev !== state.publishedTestRevision) {
      fail('Published verification revision changed after the earlier finish attempt; refusing to restore over concurrent edits.');
    }
    phase = 'test-published';
  } else if (originalContentRestored && !draftBefore) {
    if (state.restoredRevision && publishedBefore._rev !== state.restoredRevision) {
      fail('Restored homepage revision changed after the earlier finish attempt; refusing to continue over concurrent edits.');
    }
    phase = 'restored';
  } else if (originalRevisionStillPublished && expectedDraftPresent) {
    phase = 'publish';
  } else {
    fail('Current published/draft revisions do not match a safe resumable finish stage; no CMS content was changed.');
  }

  const secretBefore = await readSecretMetadata(writeClient, state.secretDocumentId);
  if (secretBefore && (secretBefore._rev !== state.secretRevision
    || secretBefore._type !== 'sanity.previewUrlSecret'
    || secretBefore.source !== SECRET_SOURCE
    || secretBefore.studioUrl !== `${origin}/studio`)) {
    fail('The verification preview secret changed; refusing to continue.');
  }
  if (phase === 'publish' && !secretBefore) {
    fail('The verification preview secret disappeared before publish; refusing to continue.');
  }

  let disabledStatus: number | undefined;
  const savedCookies = await readSavedCookiesIfPresent(origin);
  if (state.status === 'prepared' && !savedCookies) {
    fail('Saved preview cookies are missing; refusing to publish.');
  }
  state.status = 'finishing';
  if (phase === 'publish') state.stage = 'pre-publish-guards-passed';
  await replaceJson(statePath, state);
  if (savedCookies) disabledStatus = await disableSavedPreviewSession(origin, savedCookies);

  let publishedTest: LiveDocument | undefined;
  let publishedImageStatus: number | undefined;
  let restored: LiveDocument;
  const originalFirstImage = state.originalFirstImage;

  if (phase === 'publish') {
    const publishAction: PublishAction = {
      actionType: 'sanity.action.document.publish',
      draftId: DRAFT_ID,
      publishedId: PUBLISHED_ID,
      ifDraftRevisionId: state.draftRevision,
      ifPublishedRevisionId: publishedBefore._rev,
    };
    await writeClient.action(publishAction);
    publishedTest = await pollPublished(
      publishedClient,
      (document) => matchesTestDocument(document, state),
      'Published verification content',
    );
  } else if (phase === 'test-published') {
    publishedTest = publishedBefore;
  } else {
    restored = await pollPublished(
      publishedClient,
      (document) => matchesOriginalDocument(document, state)
        && (!state.restoredRevision || document._rev === state.restoredRevision),
      'Restored homepage content',
    );
  }

  if (phase !== 'restored') {
    if (!publishedTest) fail('Published verification content could not be confirmed.');
    if (state.publishedTestRevision && publishedTest._rev !== state.publishedTestRevision) {
      fail('Published verification revision does not match the saved finish state.');
    }
    state.publishedTestRevision = publishedTest._rev;
    state.stage = 'test-content-published';
    await replaceJson(statePath, state);

    const publishedTestPage = await pollHomepage(
      origin,
      [state.testTitleLine, ...state.originalTitleLines.slice(1)],
      state.assetId!,
      'Public page after publish action',
    );
    publishedImageStatus = await verifyImageReachable(publishedTestPage);

    const currentPublished = await readPublished(publishedClient);
    if (currentPublished._rev !== publishedTest._rev || !matchesTestDocument(currentPublished, state)) {
      fail('Published homepage changed after the verification publish; refusing to restore over concurrent edits.');
    }
    if (await readDraft(writeClient)) {
      fail('A new draft appeared after publish; refusing to restore while another editor is working.');
    }

    state.stage = 'restore-guard-passed';
    await replaceJson(statePath, state);
    const imagePatchPath = `hero.slides[_key=="${state.firstSlideKey}"].image`;
    await writeClient.patch(PUBLISHED_ID).ifRevisionId(currentPublished._rev).set({
      'hero.titleLines[0]': state.originalTitleLines[0],
      [imagePatchPath]: originalFirstImage,
    }).commit();
    state.stage = 'restore-patch-applied';
    await replaceJson(statePath, state);
    restored = await pollPublished(
      publishedClient,
      (document) => matchesOriginalDocument(document, state),
      'Restored homepage content',
    );
  }

  if (state.restoredRevision && restored!._rev !== state.restoredRevision) {
    fail('Restored homepage revision changed after the earlier finish attempt; refusing to continue over concurrent edits.');
  }
  state.restoredRevision = restored!._rev;
  state.stage = 'restored-content-published';
  await replaceJson(statePath, state);
  const restoredPage = await pollHomepage(
    origin,
    state.originalTitleLines,
    assetId(originalFirstImage),
    'Public page after restore',
  );
  const restoredImageStatus = await verifyImageReachable(restoredPage);
  const secretCleanup = await cleanupPreviewSecret(writeClient, state);

  state.stage = 'public-page-restored';
  state.finishedAt = new Date().toISOString();
  await replaceJson(reportPath, {
    ...previousReport,
    status: 'finished',
    publish: {
      action: 'sanity.action.document.publish',
      revision: state.publishedTestRevision ?? null,
      publicH1Matched: true,
      publicImageMatched: true,
      imageHttpStatus: publishedImageStatus ?? null,
    },
    restore: {
      revision: restored!._rev,
      publicH1Matched: true,
      publicImageMatched: true,
      imageHttpStatus: restoredImageStatus,
      originalTitleLines: state.originalTitleLines,
      originalFirstHeroAssetId: assetId(originalFirstImage),
    },
    previewSession: {
      disableEndpointStatus: disabledStatus ?? null,
      savedCookieFileRemoved: true,
      browserContextMustAlsoExitDraftMode: true,
    },
    previewSecret: {
      documentId: state.secretDocumentId,
      cleanup: secretCleanup,
      secretValueStored: false,
    },
    finishedAt: state.finishedAt,
  });

  state.status = 'finished';
  await replaceJson(statePath, state);

  console.log(`CMS live finish complete for ${PROJECT_ID}/${DATASET} at ${origin}.`);
  console.log('Publish propagation and public-page restore checks passed; no deployment was triggered.');
  console.log('The main browser context must also visit /api/draft-mode/disable to exit its own preview session.');
}

async function main() {
  const { mode, origin } = parseArguments(process.argv.slice(2));
  if (mode === 'prepare') await performPrepare(origin);
  else await performFinish(origin);
}

main().catch((error: unknown) => {
  if (error instanceof LiveCheckError) {
    console.error(`CMS live verification stopped safely: ${error.message}`);
  } else {
    console.error('CMS live verification stopped on an unexpected error. Sensitive request details were omitted.');
  }
  process.exitCode = 1;
});
