import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { CHECKOUT_REDIRECT_ROUTE, SITE_PAGE_MANIFEST } from '../src/fullsite/pageManifest';
import { LEGACY_TEMPLATES } from '../src/fullsite/legacyTemplates.generated';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app',
]);
const MAX_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESOURCES = 1_000;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_PATH = resolve(ROOT, 'output/fullsite-http-report.json');
const HOME_FONT_FALLBACKS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap',
];

type CliOptions = { origin: string; help: boolean; validateOnly: boolean };
type ResourceKind = 'stylesheet' | 'script' | 'image' | 'font' | 'media' | 'asset';
type Failure = { scope: string; path: string; check: string; message: string };
type PageResult = {
  path: string;
  status: number | null;
  contentType?: string;
  html?: string;
  error?: string;
};
type ResourceEntry = {
  url: URL;
  kinds: Set<ResourceKind>;
  referencedBy: Set<string>;
};
type ResourceResult = {
  path: string;
  kinds: string[];
  referencedByCount: number;
  status: number | null;
  contentType?: string;
  error?: string;
};

function usage(): string {
  return [
    'Usage: node --import tsx scripts/verify-fullsite-http.ts [--origin ORIGIN] [--validate] [--help]',
    '',
    `Allowed origins: ${[...ALLOWED_ORIGINS].join(' | ')}`,
    'Default origin: http://localhost:3000',
    '--validate checks CLI target safety and the local route/template registry without making HTTP requests.',
    'The full run sends anonymous GET requests only and writes output/fullsite-http-report.json.',
  ].join('\n');
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { origin: 'http://localhost:3000', help: false, validateOnly: false };
  let originWasSet = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--validate') {
      options.validateOnly = true;
      continue;
    }
    if (argument === '--origin') {
      if (originWasSet) throw new Error('--origin may be provided only once.');
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--origin requires an exact allowlisted origin.');
      options.origin = value;
      originWasSet = true;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.help && !ALLOWED_ORIGINS.has(options.origin)) {
    throw new Error('Origin rejected. Use exactly http://localhost:3000 or the allowlisted stable Preview origin.');
  }
  return options;
}

function validateLocalContract(): { contentPageCount: number; templateCount: number; homeStylesheetCount: number } {
  if (SITE_PAGE_MANIFEST.length !== 37) {
    throw new Error(`Expected 37 manifest pages, found ${SITE_PAGE_MANIFEST.length}.`);
  }
  const keys = SITE_PAGE_MANIFEST.map((page) => page.pageKey);
  const routes = SITE_PAGE_MANIFEST.map((page) => page.route);
  if (new Set(keys).size !== keys.length || new Set(routes).size !== routes.length) {
    throw new Error('The site page registry contains duplicate page keys or routes.');
  }
  if (CHECKOUT_REDIRECT_ROUTE.route !== '/checkout.html' || CHECKOUT_REDIRECT_ROUTE.destination !== '/quote.html') {
    throw new Error('Checkout redirect contract does not match the expected compatibility route.');
  }
  for (const page of SITE_PAGE_MANIFEST) {
    if (!LEGACY_TEMPLATES[page.pageKey]) throw new Error(`Missing legacy template for ${page.pageKey}.`);
    if (!page.route.startsWith('/') || page.route.includes('?') || page.route.includes('#')) {
      throw new Error(`Invalid route in site page registry: ${page.route}.`);
    }
  }

  const homeHtml = load(readFileSync(resolve(ROOT, 'index.html'), 'utf8'));
  const homeCssPaths = homeHtml('head link[rel]').toArray()
    .filter((element) => relTokens(homeHtml(element).attr('rel')).includes('stylesheet'))
    .map((element) => homeHtml(element).attr('href') || '')
    .filter((href) => href && !new URL(href, 'https://netpro.test/').hostname.includes('googleapis.com'))
    .map((href) => basename(new URL(href, 'https://netpro.test/').pathname));
  const homeLayout = readFileSync(resolve(ROOT, 'app/(site)/layout.tsx'), 'utf8');
  const importedCssPaths = [...homeLayout.matchAll(/import\s+["']([^"']+\.css)["']/g)]
    .map((match) => basename(match[1]));
  if (homeCssPaths.length === 0 || homeCssPaths.join('\0') !== importedCssPaths.join('\0')) {
    throw new Error('Homepage CSS imports no longer preserve the legacy stylesheet order.');
  }
  assertHomepageStylesheetFontOrderFixture();
  assertCustomNotFoundContractFixture();
  return { contentPageCount: SITE_PAGE_MANIFEST.length, templateCount: Object.keys(LEGACY_TEMPLATES).length, homeStylesheetCount: homeCssPaths.length };
}

function relTokens(value: string | undefined): string[] {
  return (value || '').toLowerCase().split(/\s+/).filter(Boolean);
}

function pageBase($: ReturnType<typeof load>, requestedUrl: URL): URL {
  const href = $('base[href]').first().attr('href');
  if (!href) return requestedUrl;
  try { return new URL(href, requestedUrl); } catch { return requestedUrl; }
}

function orderedHeadReferences(html: string, requestedUrl: URL): string[] {
  const $ = load(html);
  const base = pageBase($, requestedUrl);
  return $('head link[rel][href]').toArray()
    .filter((element) => relTokens($(element).attr('rel')).some((token) => token === 'preconnect' || token === 'stylesheet'))
    .map((element) => referenceSignature($(element).attr('href') || '', base));
}

function referenceSignature(href: string, base: URL): string {
  try {
    const url = new URL(href, base);
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return href.trim();
  }
}

function hasOrderedSubsequence(actual: string[], expected: string[]): boolean {
  let cursor = 0;
  for (const item of expected) {
    const found = actual.indexOf(item, cursor);
    if (found < 0) return false;
    cursor = found + 1;
  }
  return true;
}

function homepageStylesheetFontOrderIsValid(html: string, requestedUrl: URL): boolean {
  const $ = load(html);
  const links = $('head link[rel][href]').toArray().map((element, index) => {
    const rel = relTokens($(element).attr('rel'));
    const href = $(element).attr('href') || '';
    try {
      return { index, rel, url: new URL(href, requestedUrl) };
    } catch {
      return undefined;
    }
  }).filter((link): link is { index: number; rel: string[]; url: URL } => Boolean(link));

  // Next can emit several CSS chunks from the same ordered layout imports.
  // The source order is checked against index.html and app/(site)/layout.tsx above;
  // at runtime, require every app bundle before the font hints.
  const appStylesheets = links.filter((link) => link.rel.includes('stylesheet')
    && link.url.origin === requestedUrl.origin
    && link.url.pathname.startsWith('/_next/static/')
    && /\.css$/i.test(link.url.pathname));
  const googleOrigin = new URL(HOME_FONT_FALLBACKS[0]).origin;
  const gstaticOrigin = new URL(HOME_FONT_FALLBACKS[1]).origin;
  const googlePreconnect = links.find((link) => link.rel.includes('preconnect') && link.url.origin === googleOrigin);
  const gstaticPreconnect = links.find((link) => link.rel.includes('preconnect') && link.url.origin === gstaticOrigin);
  const googleFontStylesheet = links.find((link) => link.rel.includes('stylesheet')
    && referenceSignature(link.url.href, requestedUrl)
      === referenceSignature(HOME_FONT_FALLBACKS[2], requestedUrl));

  return appStylesheets.length > 0
    && Boolean(googlePreconnect && gstaticPreconnect && googleFontStylesheet)
    && appStylesheets.every((link) => link.index < googlePreconnect!.index)
    && googlePreconnect!.index < gstaticPreconnect!.index
    && gstaticPreconnect!.index < googleFontStylesheet!.index;
}

function assertHomepageStylesheetFontOrderFixture(): void {
  const requestedUrl = new URL('http://localhost:3000/');
  const cssBundles = Array.from({ length: 4 }, (_, index) =>
    `<link rel="stylesheet" href="/_next/static/chunks/app-${index}.css" data-precedence="next">`).join('');
  const fontHints = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">';
  const fontStylesheet = `<link href="${HOME_FONT_FALLBACKS[2]}" rel="stylesheet">`;
  if (!homepageStylesheetFontOrderIsValid(`<html><head>${cssBundles}${fontHints}${fontStylesheet}</head></html>`, requestedUrl)) {
    throw new Error('Homepage stylesheet/font check rejected multiple Next CSS bundles before the font hints.');
  }
  if (homepageStylesheetFontOrderIsValid(`<html><head>${cssBundles}${fontStylesheet}${fontHints}</head></html>`, requestedUrl)) {
    throw new Error('Homepage stylesheet/font check accepted Google Fonts before its preconnect hints.');
  }
}

function expectedHeadReferences(templateHtml: string, requestedUrl: URL): string[] {
  return orderedHeadReferences(templateHtml, requestedUrl);
}

function safePath(url: URL): string {
  return `${url.pathname}${url.search ? '?[query]' : ''}`;
}

function isVercelLoginHtml(html: string, $: ReturnType<typeof load>): boolean {
  const title = $('title').first().text().toLowerCase();
  const sample = $.root().text().slice(0, 100_000).toLowerCase();
  return /authentication required|vercel authentication|deployment protection|vercel sso/.test(title)
    || /__vercel_authentication|vercel\.com\/login|deployment protection|authentication required/.test(sample)
    || /<form[^>]+(?:login|auth)/i.test(html.slice(0, 100_000));
}

function addFailure(failures: Failure[], scope: string, path: string, check: string, message: string): void {
  failures.push({ scope, path, check, message });
}

type UnknownUrlChecks = {
  status404: boolean;
  html: boolean;
  notVercelLogin: boolean;
  h1: boolean;
  bodyClass: boolean;
  noindexRobots: boolean;
  stylesFontsOrder: boolean;
  visibleContent: boolean;
  keyReturnLinks: boolean;
};

function normalizedText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isHiddenInMarkup($: ReturnType<typeof load>, element: unknown): boolean {
  const node = $(element as Parameters<ReturnType<typeof load>>[0]);
  return node.closest('[hidden], [aria-hidden="true"]').length > 0
    || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(node.attr('style') || '');
}

function checkUnknownUrlResponse(input: {
  result: PageResult;
  origin: string;
  failures: Failure[];
}): { report: Record<string, unknown>; assetUrls: Array<{ url: URL; kind: ResourceKind }> } {
  const { result, origin, failures } = input;
  const path = result.path;
  const url = new URL(path, origin);
  const checks: UnknownUrlChecks = {
    status404: result.status === 404,
    html: Boolean(result.html && /(?:text\/html|application\/xhtml\+xml)/i.test(result.contentType || '')),
    notVercelLogin: false,
    h1: false,
    bodyClass: false,
    noindexRobots: false,
    stylesFontsOrder: false,
    visibleContent: false,
    keyReturnLinks: false,
  };
  const assetUrls: Array<{ url: URL; kind: ResourceKind }> = [];

  if (!checks.status404) addFailure(failures, 'notFound', path, 'status', `Expected 404; received ${result.status ?? result.error ?? 'no response'}.`);
  if (!checks.html) {
    addFailure(failures, 'notFound', path, 'html', `Expected an HTML 404 response; received ${result.contentType || 'no HTML content type'}.`);
  } else {
    const html = result.html!;
    const $ = load(html);
    const expected = load(LEGACY_TEMPLATES['404']);
    const main = $('main').first();
    const expectedMain = expected('main').first();
    checks.notVercelLogin = !isVercelLoginHtml(html, $);
    if (!checks.notVercelLogin) addFailure(failures, 'notFound', path, 'notLogin', 'Unknown URL returned a Vercel authentication page.');

    const expectedH1Count = expectedMain.find('h1').length;
    const h1Values = main.find('h1').toArray()
      .filter((element) => !isHiddenInMarkup($, element))
      .map((element) => normalizedText($(element).text()));
    checks.h1 = expectedH1Count > 0 && h1Values.length === expectedH1Count && h1Values.every(Boolean);
    if (!checks.h1) addFailure(failures, 'notFound', path, 'h1', 'Expected the legacy not-found main content to render its non-empty H1.');

    const bodyClass = $('body').attr('class') || '';
    checks.bodyClass = bodyClass === expectedBodyClass('404');
    if (!checks.bodyClass) addFailure(failures, 'notFound', path, 'bodyClass', 'Body class did not match the registered 404 template.');

    const robots = $('head meta[name]').toArray()
      .filter((element) => ($(element).attr('name') || '').toLowerCase() === 'robots');
    checks.noindexRobots = robots.length === 1 && /\bnoindex\b/i.test($(robots[0]).attr('content') || '');
    if (!checks.noindexRobots) addFailure(failures, 'notFound', path, 'robots', `Expected one noindex robots meta; found ${robots.length}.`);

    const actualHead = orderedHeadReferences(html, url);
    // Legacy 404 assets are root-relative in the handler so nested unknown URLs keep loading them.
    const templateRoot = new URL('/', url.origin);
    const expectedHead = expectedHeadReferences(LEGACY_TEMPLATES['404'], templateRoot);
    checks.stylesFontsOrder = expectedHead.length > 0 && hasOrderedSubsequence(actualHead, expectedHead);
    if (!checks.stylesFontsOrder) addFailure(failures, 'notFound', path, 'cssFontOrder', 'Rendered 404 stylesheet/font links did not preserve the original template order.');

    const expectedParagraphCount = expectedMain.find('p').toArray()
      .filter((element) => normalizedText(expected(element).text())).length;
    const actualParagraphCount = main.find('p').toArray()
      .filter((element) => normalizedText($(element).text()) && !isHiddenInMarkup($, element)).length;
    const mainText = normalizedText(main.text());
    checks.visibleContent = expectedMain.length > 0
      && !isHiddenInMarkup($, main.get(0))
      && mainText.length > 0
      && expectedParagraphCount > 0
      && actualParagraphCount >= expectedParagraphCount;
    if (!checks.visibleContent) addFailure(failures, 'notFound', path, 'visibleContent', 'Legacy 404 main content or its visible descriptive text was missing.');

    const expectedBase = pageBase(expected, url);
    const actualBase = pageBase($, url);
    const expectedReturnLinks = expectedMain.find('a[href]').toArray().map((element) => ({
      href: referenceSignature(expected(element).attr('href') || '', expectedBase),
    }));
    const actualReturnLinks = main.find('a[href]').toArray().filter((element) =>
      normalizedText($(element).text()) && !isHiddenInMarkup($, element)).map((element) =>
      referenceSignature($(element).attr('href') || '', actualBase));
    checks.keyReturnLinks = expectedReturnLinks.length > 0
      && expectedReturnLinks.every((href) => actualReturnLinks.includes(href.href));
    if (!checks.keyReturnLinks) addFailure(failures, 'notFound', path, 'keyReturnLinks', 'Legacy 404 product/contact return links were missing or changed.');

    assetUrls.push(...collectAssetUrls($, url));
  }

  return {
    report: { path, status: result.status, contentType: result.contentType, checks, resourceCount: assetUrls.length },
    assetUrls,
  };
}

function rootRelativeTemplateHead(html: string, origin: string): string {
  const $ = load(html);
  $('head link[rel][href]').each((_index, element) => {
    const node = $(element);
    const href = node.attr('href') || '';
    try {
      const resolved = new URL(href, `${origin}/`);
      if (resolved.origin === origin && !href.startsWith('/')) {
        node.attr('href', `${resolved.pathname}${resolved.search}${resolved.hash}`);
      }
    } catch {
      // Keep malformed template references intact so the contract check can reject them.
    }
  });
  return $.html();
}

function assertCustomNotFoundContractFixture(): void {
  const origin = 'http://localhost:3000';
  const nestedRootRelativeHtml = rootRelativeTemplateHead(LEGACY_TEMPLATES['404'], origin);
  const validFailures: Failure[] = [];
  const valid = checkUnknownUrlResponse({
    result: { path: '/nested/path/unknown-fixture', status: 404, contentType: 'text/html; charset=utf-8', html: nestedRootRelativeHtml },
    origin,
    failures: validFailures,
  });
  if (Object.values(valid.report.checks as UnknownUrlChecks).some((passed) => !passed) || validFailures.length) {
    throw new Error('The root-relative legacy 404 template failed its nested-path contract fixture.');
  }

  const misorderedHtml = load(nestedRootRelativeHtml);
  const stylesheet = misorderedHtml('head link[rel][href]').toArray()
    .find((element) => relTokens(misorderedHtml(element).attr('rel')).includes('stylesheet'));
  if (stylesheet) misorderedHtml(stylesheet).remove();
  const orderFailures: Failure[] = [];
  const missingStylesheet = checkUnknownUrlResponse({
    result: { path: '/nested/path/unknown-fixture', status: 404, contentType: 'text/html; charset=utf-8', html: misorderedHtml.html() },
    origin,
    failures: orderFailures,
  });
  if ((missingStylesheet.report.checks as UnknownUrlChecks).stylesFontsOrder
    || !orderFailures.some((failure) => failure.check === 'cssFontOrder')) {
    throw new Error('The nested 404 font/style contract accepted a missing root-relative stylesheet.');
  }

  const platformFailures: Failure[] = [];
  const platformDefault = checkUnknownUrlResponse({
    result: { path: '/unknown-fixture', status: 404, contentType: 'text/html', html: '<html><head><meta name="robots" content="noindex"></head><body><h1>404: NOT_FOUND</h1><main>Not found</main></body></html>' },
    origin,
    failures: platformFailures,
  });
  if (Object.values(platformDefault.report.checks as UnknownUrlChecks).every(Boolean)) {
    throw new Error('The local not-found contract fixture accepted a generic platform 404.');
  }
}

function checkHtmlPage(input: {
  html: string;
  url: URL;
  path: string;
  expectedBodyClass?: string;
  templateHtml?: string;
  isHome?: boolean;
  failures: Failure[];
}): { h1Count: number; assetUrls: Array<{ url: URL; kind: ResourceKind }> } {
  const { html, url, path, failures } = input;
  const $ = load(html);
  const h1Values = $('h1').toArray().map((element) => $(element).text().replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!h1Values.length) addFailure(failures, 'page', path, 'h1', 'No non-empty H1 was rendered.');

  const canonicals = $('head link[rel]').toArray().filter((element) => relTokens($(element).attr('rel')).includes('canonical'));
  if (canonicals.length !== 1 || !$(canonicals[0]).attr('href')) {
    addFailure(failures, 'page', path, 'canonical', `Expected one canonical link with href; found ${canonicals.length}.`);
  } else {
    try {
      const canonical = new URL($(canonicals[0]).attr('href') || '', url);
      if (!['http:', 'https:'].includes(canonical.protocol)) throw new Error('invalid protocol');
    } catch {
      addFailure(failures, 'page', path, 'canonical', 'Canonical href is not a valid HTTP(S) URL.');
    }
  }

  const robots = $('head meta[name]').toArray().filter((element) => ($(element).attr('name') || '').toLowerCase() === 'robots');
  if (robots.length !== 1 || !/\bnoindex\b/i.test($(robots[0]).attr('content') || '')) {
    addFailure(failures, 'page', path, 'robots', `Expected one noindex robots meta; found ${robots.length}.`);
  }

  if (input.expectedBodyClass !== undefined && $('body').attr('class') !== input.expectedBodyClass) {
    addFailure(failures, 'page', path, 'bodyClass', `Body class did not match the registered template contract.`);
  }

  if (isVercelLoginHtml(html, $)) addFailure(failures, 'page', path, 'notLogin', 'Response looks like a Vercel authentication page.');
  if (!/self\.__next_f\.push\s*\(/.test(html)) {
    addFailure(failures, 'page', path, 'nextSsr', 'Next.js App Router Flight SSR marker was not found.');
  }

  const actualHead = orderedHeadReferences(html, url);
  if (input.templateHtml) {
    const expectedHead = expectedHeadReferences(input.templateHtml, url);
    if (!expectedHead.length || !hasOrderedSubsequence(actualHead, expectedHead)) {
      addFailure(failures, 'page', path, 'cssFontOrder', 'Rendered stylesheet/font link order differs from the registered legacy template.');
    }
  } else if (input.isHome) {
    if (!homepageStylesheetFontOrderIsValid(html, url)) {
      addFailure(failures, 'page', path, 'cssFontOrder', 'Homepage stylesheet bundles and Google Fonts preconnect/style hints were missing or out of order.');
    }
  }

  return { h1Count: h1Values.length, assetUrls: collectAssetUrls($, url) };
}

function addSameOriginAsset(
  output: Array<{ url: URL; kind: ResourceKind }>,
  raw: string | undefined,
  base: URL,
  kind: ResourceKind,
  origin: string,
): void {
  if (!raw) return;
  const value = raw.trim();
  if (!value || value.startsWith('#') || /^(?:data|blob|javascript|mailto|tel):/i.test(value)) return;
  try {
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) return;
    if (url.username || url.password) return;
    output.push({ url, kind });
  } catch {
    // Invalid and external resource references are omitted from anonymous same-origin checks.
  }
}

function addSrcsetAssets(
  output: Array<{ url: URL; kind: ResourceKind }>,
  srcset: string | undefined,
  base: URL,
  origin: string,
): void {
  if (!srcset || srcset.trim().toLowerCase().startsWith('data:')) return;
  for (const candidate of srcset.split(',')) {
    const url = candidate.trim().split(/\s+/)[0];
    addSameOriginAsset(output, url, base, 'image', origin);
  }
}

function collectAssetUrls($: ReturnType<typeof load>, requestedUrl: URL): Array<{ url: URL; kind: ResourceKind }> {
  const output: Array<{ url: URL; kind: ResourceKind }> = [];
  const base = pageBase($, requestedUrl);
  const origin = requestedUrl.origin;

  $('link[rel][href]').each((_, element) => {
    const rel = relTokens($(element).attr('rel'));
    if (rel.includes('stylesheet')) addSameOriginAsset(output, $(element).attr('href'), base, 'stylesheet', origin);
    else if (rel.includes('icon') || rel.includes('apple-touch-icon')) addSameOriginAsset(output, $(element).attr('href'), base, 'image', origin);
    else if (rel.includes('preload')) {
      const as = ($(element).attr('as') || '').toLowerCase();
      const kind: ResourceKind = as === 'style' ? 'stylesheet' : as === 'script' ? 'script' : as === 'image' ? 'image' : as === 'font' ? 'font' : 'asset';
      addSameOriginAsset(output, $(element).attr('href'), base, kind, origin);
    }
  });
  $('script[src]').each((_, element) => addSameOriginAsset(output, $(element).attr('src'), base, 'script', origin));
  $('img[src]').each((_, element) => addSameOriginAsset(output, $(element).attr('src'), base, 'image', origin));
  $('img[srcset], source[srcset]').each((_, element) => addSrcsetAssets(output, $(element).attr('srcset'), base, origin));
  $('source[src]').each((_, element) => addSameOriginAsset(output, $(element).attr('src'), base, 'media', origin));
  $('video[poster]').each((_, element) => addSameOriginAsset(output, $(element).attr('poster'), base, 'image', origin));
  $('[style]').each((_, element) => collectCssReferences($(element).attr('style') || '', base, origin, output));
  $('style').each((_, element) => collectCssReferences($(element).text(), base, origin, output));
  return output;
}

function classifyResource(url: URL, fallback: ResourceKind = 'asset'): ResourceKind {
  const extension = url.pathname.toLowerCase().split('.').pop() || '';
  if (extension === 'css') return 'stylesheet';
  if (extension === 'js' || extension === 'mjs') return 'script';
  if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg', 'ico'].includes(extension)) return 'image';
  if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension)) return 'font';
  return fallback;
}

function collectCssReferences(css: string, base: URL, origin: string, output: Array<{ url: URL; kind: ResourceKind }>): void {
  const references = new Set<string>();
  const urlPattern = /url\(\s*(?:["']([^"']+)["']|([^)]*?))\s*\)/gi;
  const importPattern = /@import\s+(?:url\(\s*)?["']([^"']+)["']/gi;
  for (const match of css.matchAll(urlPattern)) references.add((match[1] || match[2] || '').trim());
  for (const match of css.matchAll(importPattern)) references.add((match[1] || '').trim());
  for (const reference of references) {
    const kind = classifyResource(safeResolve(reference, base) ?? base);
    addSameOriginAsset(output, reference, base, kind, origin);
  }
}

function safeResolve(raw: string, base: URL): URL | null {
  try { return new URL(raw, base); } catch { return null; }
}

function addResource(resources: Map<string, ResourceEntry>, candidate: { url: URL; kind: ResourceKind }, pagePath: string): void {
  const key = candidate.url.href;
  let entry = resources.get(key);
  if (!entry) {
    entry = { url: candidate.url, kinds: new Set(), referencedBy: new Set() };
    resources.set(key, entry);
  }
  entry.kinds.add(candidate.kind);
  entry.referencedBy.add(pagePath);
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchPage(origin: string, path: string): Promise<PageResult> {
  const url = new URL(path, origin);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      headers: { accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const contentType = response.headers.get('content-type') || undefined;
    const html = contentType?.includes('text/html') || contentType?.includes('application/xhtml+xml')
      ? await response.text()
      : undefined;
    if (html === undefined) await response.body?.cancel();
    return { path, status: response.status, contentType, html };
  } catch (error) {
    return { path, status: null, error: error instanceof Error ? error.name : 'RequestError' };
  }
}

async function fetchResource(entry: ResourceEntry): Promise<{ result: ResourceResult; cssText?: string }> {
  try {
    const response = await fetch(entry.url, {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      headers: { accept: '*/*' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const contentType = response.headers.get('content-type') || undefined;
    const isCss = entry.kinds.has('stylesheet') || entry.url.pathname.toLowerCase().endsWith('.css');
    const cssText = isCss && response.status === 200 ? await response.text() : undefined;
    if (cssText === undefined) await response.body?.cancel();
    return {
      result: { path: safePath(entry.url), kinds: [...entry.kinds].sort(), referencedByCount: entry.referencedBy.size, status: response.status, contentType },
      ...(cssText !== undefined ? { cssText } : {}),
    };
  } catch (error) {
    return {
      result: {
        path: safePath(entry.url),
        kinds: [...entry.kinds].sort(),
        referencedByCount: entry.referencedBy.size,
        status: null,
        error: error instanceof Error ? error.name : 'RequestError',
      },
    };
  }
}

function expectedBodyClass(pageKey: string): string {
  const template = LEGACY_TEMPLATES[pageKey];
  return load(template)('body').attr('class') || '';
}

function checkRedirectLocation(origin: string, path: string, expectedPath: string, response: Response, failures: Failure[]): string | undefined {
  const location = response.headers.get('location') || undefined;
  if (!location) {
    addFailure(failures, 'redirect', path, 'location', 'Redirect response did not include a Location header.');
    return undefined;
  }
  try {
    const destination = new URL(location, new URL(path, origin));
    if (destination.origin !== origin || destination.pathname !== expectedPath) {
      addFailure(failures, 'redirect', path, 'destination', `Redirect destination did not match ${expectedPath} on the allowlisted origin.`);
    }
    return safePath(destination);
  } catch {
    addFailure(failures, 'redirect', path, 'destination', 'Redirect Location was not a valid same-origin URL.');
    return undefined;
  }
}

async function fetchRedirect(origin: string, path: string): Promise<{ response?: Response; error?: string }> {
  try {
    const response = await fetch(new URL(path, origin), {
      method: 'GET',
      redirect: 'manual',
      credentials: 'omit',
      headers: { accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return { response };
  } catch (error) {
    return { error: error instanceof Error ? error.name : 'RequestError' };
  }
}

async function checkRedirect(origin: string, path: string, expectedPath: string, failures: Failure[]): Promise<{ path: string; status: number | null; location?: string }> {
  const result = await fetchRedirect(origin, path);
  if (!result.response) {
    addFailure(failures, 'redirect', path, 'request', `Request failed (${result.error || 'RequestError'}).`);
    return { path, status: null };
  }
  const response = result.response;
  if (response.status !== 307 && response.status !== 308) {
    addFailure(failures, 'redirect', path, 'status', `Expected a temporary redirect; received ${response.status}.`);
  }
  const location = checkRedirectLocation(origin, path, expectedPath, response, failures);
  await response.body?.cancel();
  return { path, status: response.status, ...(location ? { location } : {}) };
}

async function runSmoke(origin: string): Promise<Record<string, unknown>> {
  const failures: Failure[] = [];
  const resources = new Map<string, ResourceEntry>();
  const contentPages = SITE_PAGE_MANIFEST.map((entry) => ({ path: entry.route, pageKey: entry.pageKey }));
  const pageTargets = [
    { path: '/', label: 'home', expectedBodyClass: 'home-page', isHome: true as const },
    ...contentPages.map((page) => ({ path: page.path, label: page.pageKey, expectedBodyClass: expectedBodyClass(page.pageKey), templateHtml: LEGACY_TEMPLATES[page.pageKey] })),
    { path: '/privacy-policy', label: 'privacy-policy-alias', expectedBodyClass: expectedBodyClass('privacy-policy'), templateHtml: LEGACY_TEMPLATES['privacy-policy'] },
    { path: '/terms', label: 'terms-alias', expectedBodyClass: expectedBodyClass('terms'), templateHtml: LEGACY_TEMPLATES.terms },
  ];
  const pageResults = await mapWithConcurrency(pageTargets, MAX_CONCURRENCY, async (target) => ({
    target,
    result: await fetchPage(origin, target.path),
  }));
  const pageReports: Array<Record<string, unknown>> = [];

  for (const { target, result } of pageResults) {
    const checks: Record<string, boolean> = {};
    if (result.status !== 200) {
      addFailure(failures, 'page', target.path, 'status', `Expected 200; received ${result.status ?? result.error ?? 'no response'}.`);
      checks.status200 = false;
    } else checks.status200 = true;
    if (!result.html) {
      addFailure(failures, 'page', target.path, 'html', `Expected an HTML response; received ${result.contentType || 'no HTML content type'}.`);
      pageReports.push({ path: target.path, label: target.label, status: result.status, contentType: result.contentType, checks, resourceCount: 0 });
      continue;
    }
    const checked = checkHtmlPage({
      html: result.html,
      url: new URL(target.path, origin),
      path: target.path,
      expectedBodyClass: target.expectedBodyClass,
      ...('templateHtml' in target ? { templateHtml: target.templateHtml } : {}),
      ...('isHome' in target ? { isHome: target.isHome } : {}),
      failures,
    });
    checks.h1 = checked.h1Count > 0;
    checks.canonical = !failures.some((failure) => failure.path === target.path && failure.check === 'canonical');
    checks.noindexRobots = !failures.some((failure) => failure.path === target.path && failure.check === 'robots');
    checks.bodyClass = !failures.some((failure) => failure.path === target.path && failure.check === 'bodyClass');
    checks.stylesFontsOrder = !failures.some((failure) => failure.path === target.path && failure.check === 'cssFontOrder');
    checks.notVercelLogin = !failures.some((failure) => failure.path === target.path && failure.check === 'notLogin');
    checks.nextSsrMarker = !failures.some((failure) => failure.path === target.path && failure.check === 'nextSsr');
    checked.assetUrls.forEach((candidate) => addResource(resources, candidate, target.path));
    pageReports.push({ path: target.path, label: target.label, status: result.status, contentType: result.contentType, checks, resourceCount: checked.assetUrls.length });
  }

  const redirectReports: Array<Record<string, unknown>> = [];
  redirectReports.push(await checkRedirect(origin, '/index.html', '/', failures));
  redirectReports.push(await checkRedirect(origin, CHECKOUT_REDIRECT_ROUTE.route, CHECKOUT_REDIRECT_ROUTE.destination, failures));

  const unknownPaths = [
    '/__fullsite-http-smoke-unknown-route__',
    '/__fullsite-http-smoke-unknown-route__/nested/path',
  ];
  const unknownResponses = await mapWithConcurrency(unknownPaths, MAX_CONCURRENCY, async (path) => fetchPage(origin, path));
  const unknownReports = unknownResponses.map((result) => {
    const checked = checkUnknownUrlResponse({ result, origin, failures });
    checked.assetUrls.forEach((candidate) => addResource(resources, candidate, result.path));
    return checked.report;
  });
  const allUnknownUrls404 = unknownResponses.length === unknownPaths.length
    && unknownResponses.every((result) => result.status === 404);

  if (resources.size > MAX_RESOURCES) addFailure(failures, 'assets', '/', 'resourceLimit', `Found ${resources.size} unique same-origin resources; limit is ${MAX_RESOURCES}.`);
  const fetchedResources = new Map<string, { result: ResourceResult; cssText?: string }>();
  const processed = new Set<string>();
  while (true) {
    const batch = [...resources.entries()].filter(([key]) => !processed.has(key));
    if (!batch.length) break;
    const results = await mapWithConcurrency(batch, MAX_CONCURRENCY, async ([key, entry]) => ({ key, fetched: await fetchResource(entry) }));
    for (const { key, fetched } of results) {
      processed.add(key);
      fetchedResources.set(key, fetched);
      if (fetched.cssText) {
        const references: Array<{ url: URL; kind: ResourceKind }> = [];
        collectCssReferences(fetched.cssText, resources.get(key)!.url, origin, references);
        references.forEach((candidate) => {
          const referencedBy = [...resources.get(key)!.referencedBy];
          for (const pagePath of referencedBy) addResource(resources, candidate, pagePath);
        });
      }
    }
    if (resources.size > MAX_RESOURCES) {
      addFailure(failures, 'assets', '/', 'resourceLimit', `CSS references expanded the set beyond ${MAX_RESOURCES} resources.`);
      break;
    }
  }

  const resourceReports = [...resources.entries()].map(([key, entry]) => {
    const fetched = fetchedResources.get(key);
    const result = fetched?.result ?? {
      path: safePath(entry.url), kinds: [...entry.kinds].sort(), referencedByCount: entry.referencedBy.size,
      status: null, error: 'NotFetched',
    };
    if (result.status !== 200) {
      addFailure(failures, 'asset', result.path, 'status', `Expected 200; received ${result.status ?? result.error ?? 'no response'}.`);
    }
    return result;
  }).sort((a, b) => a.path.localeCompare(b.path));

  const summary = {
    origin,
    mode: 'anonymous HTTP-only smoke check',
    requests: 'GET only; redirects are inspected manually and never followed; credentials omitted; no cookies or authorization headers sent.',
    writes: 'No site or CMS writes. The only file written is this ignored JSON report.',
    concurrencyLimit: MAX_CONCURRENCY,
    counts: {
      contentPages: SITE_PAGE_MANIFEST.length,
      homepage: 1,
      aliases: 2,
      redirects: 2,
      unknownUrl404: allUnknownUrls404,
      unknownUrls: unknownReports.length,
      uniqueSameOriginResources: resources.size,
      failures: failures.length,
    },
    pages: pageReports,
    redirects: redirectReports,
    unknownUrl: unknownReports[0],
    unknownUrls: unknownReports,
    resources: resourceReports,
    failures,
    limitations: [
      'This is an anonymous HTTP response and resource check; it does not execute browser JavaScript or validate visual layout/interactions.',
      'External links, external fonts/images, forms, and mail/API POSTs are not requested; no CMS reads or writes are performed by this script.',
      'Homepage styles are bundled by Next.js; runtime accepts one or more CSS bundles before Google Fonts hints, while source stylesheet imports are compared with the legacy order separately.',
      'The homepage and 37 registered content pages require the Next.js App Router Flight marker. Unknown paths use the custom 404 handler and are checked against the registered legacy 404 contract instead.',
      'CMS-authenticated preview behavior and any Vercel login requirement are outside this anonymous smoke check.',
    ],
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), ...summary }, null, 2)}\n`, 'utf8');
  return { ...summary, reportPath: REPORT_PATH };
}

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Invalid arguments'}\n\n${usage()}\n`);
    process.exitCode = 1;
    return;
  }
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  try {
    const localContract = validateLocalContract();
    if (options.validateOnly) {
      process.stdout.write(`${JSON.stringify({ valid: true, origin: options.origin, httpRequests: 0, ...localContract }, null, 2)}\n`);
      return;
    }
    const report = await runSmoke(options.origin);
    process.stdout.write(`${JSON.stringify({
      origin: options.origin,
      contentPages: SITE_PAGE_MANIFEST.length,
      homepage: 1,
      uniqueSameOriginResources: (report.counts as { uniqueSameOriginResources: number }).uniqueSameOriginResources,
      failures: (report.counts as { failures: number }).failures,
      reportPath: REPORT_PATH,
    }, null, 2)}\n`);
    if ((report.counts as { failures: number }).failures > 0) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Verification failed'}\n`);
    process.exitCode = 1;
  }
}

void main();
