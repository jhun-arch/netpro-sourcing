import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test, { after, before } from 'node:test';
import { load } from 'cheerio';
import { decodeSanityNodeData } from '@sanity/visual-editing-csm';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSitePageDocuments, buildSiteSettingsDocument } from '../scripts/seed-pages';
import { LEGACY_TEMPLATES } from '../src/fullsite/legacyTemplates.generated';
import { PAGE_BINDINGS, type GeneratedPageBinding } from '../src/fullsite/pageBindings.generated';
import { SITE_PAGE_MANIFEST } from '../src/fullsite/pageManifest';
import type { SanityImage } from '../src/cms/types';
import type { CatalogData } from '../src/catalog/types';
import type { SitePageDocument, SiteSettingsDocument } from '../src/fullsite/types';

const runtimeRequire = createRequire(path.join(process.cwd(), 'tests', 'fullsite-render.test.ts'));
const { JSDOM } = runtimeRequire('jsdom') as { JSDOM: new (...args: any[]) => any };

type RendererModule = typeof import('../src/fullsite/templateRenderer');
type ContentModule = typeof import('../src/fullsite/content');
type NotFoundRouteModule = typeof import('../app/api/not-found-page/document');
let getLegacyPageShell: RendererModule['getLegacyPageShell'];
let getLegacyScripts: RendererModule['getLegacyScripts'];
let renderLegacyPageBody: RendererModule['renderLegacyPageBody'];
let requiresCatalogBootstrap: RendererModule['requiresCatalogBootstrap'];
let getSitePageMetadata: ContentModule['getSitePageMetadata'];
let applySiteHeaderSettings: typeof import('../src/fullsite/shared')['applySiteHeaderSettings'];
let createNotFoundPageResponse: NotFoundRouteModule['createNotFoundPageResponse'];

// The renderer is a server-only module. Replace only that marker during this
// isolated Node SSR test so React DOM server uses its regular (non-RSC) build.
const markerDirectory = mkdtempSync(path.join(tmpdir(), 'netpro-fullsite-ssr-'));
const markerPath = path.join(markerDirectory, 'server-only.cjs');
writeFileSync(markerPath, 'module.exports = {};\n', 'utf8');
const markerUrl = pathToFileURL(markerPath).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return { url: markerUrl, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

before(async () => {
  const [renderer, content, shared, notFoundRoute] = await Promise.all([
    import('../src/fullsite/templateRenderer'),
    import('../src/fullsite/content'),
    import('../src/fullsite/shared'),
    import('../app/api/not-found-page/document'),
  ]);
  ({ getLegacyPageShell, getLegacyScripts, renderLegacyPageBody, requiresCatalogBootstrap } = renderer);
  ({ getSitePageMetadata } = content);
  ({ applySiteHeaderSettings } = shared);
  ({ createNotFoundPageResponse } = notFoundRoute);
});
after(() => rmSync(markerDirectory, { recursive: true, force: true }));

const ORIGINAL_PAGES = buildSitePageDocuments();
const ORIGINAL_SETTINGS = buildSettingsFixture();

function buildSettingsFixture(): SiteSettingsDocument {
  return { ...JSON.parse(JSON.stringify(buildSiteSettingsDocument())), _rev: 'fixture-rev' } as SiteSettingsDocument;
}

function pageFixture(pageKey: string): SitePageDocument {
  const entry = SITE_PAGE_MANIFEST.find((page) => page.pageKey === pageKey);
  assert.ok(entry, `expected page manifest entry for ${pageKey}`);
  const page = ORIGINAL_PAGES.find((document) => document._id === entry.docId);
  assert.ok(page, `expected seed fixture for ${pageKey}`);
  return { ...JSON.parse(JSON.stringify(page)), _rev: 'fixture-rev' } as unknown as SitePageDocument;
}

function mutablePageFixture(pageKey: string): SitePageDocument {
  return pageFixture(pageKey);
}

function slotFor(page: SitePageDocument, slotId: string) {
  const found = page.sections.flatMap((section) => section.slots).find((slot) => slot.slotId === slotId);
  assert.ok(found, `expected slot ${slotId}`);
  return found;
}

function parseFragment(markup: string) {
  return load(markup, { scriptingEnabled: true }, false);
}

function rootReference(value: string | undefined): string | undefined {
  if (value === undefined || !value.trim() || /^(?:\/|#|\/\/|[a-z][a-z0-9+.-]*:)/i.test(value.trim())) return value;
  const url = new URL(value, 'https://netpro.example.test/');
  return url.pathname + url.search + url.hash;
}
function normalizedStyle(value: string): string {
  return value.split(';').map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const separator = entry.indexOf(':');
    if (separator < 0) return entry;
    const property = entry.slice(0, separator).trim().toLowerCase();
    const value = entry.slice(separator + 1).trim().replace(/url\((['"])(.*?)\1\)/gi, 'url($2)');
    return `${property}:${value}`;
  }).sort().join(';');
}

function domShape(nodes: any[]): unknown[] {
  return nodes.flatMap((node) => {
    if (node.type === 'text') return [['#text', node.data]];
    if (node.type !== 'tag') return [];
    const attributes = Object.entries(node.attribs ?? {}).map(([name, value]) => [
      name.toLowerCase(), name.toLowerCase() === 'style' ? normalizedStyle(String(value)) : value,
    ]).sort(([a], [b]) => String(a).localeCompare(String(b)));
    return [[node.tagName, attributes, domShape(node.children ?? [])]];
  });
}

function firstShapeDifference(actual: any, expected: any, path = '$'): { path: string; actual: unknown; expected: unknown } | undefined {
  if (Object.is(actual, expected)) return undefined;
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return { path: `${path}.length`, actual: actual.length, expected: expected.length };
    for (let index = 0; index < actual.length; index += 1) {
      const difference = firstShapeDifference(actual[index], expected[index], `${path}[${index}]`);
      if (difference) return difference;
    }
    return undefined;
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
    for (const key of keys) {
      const difference = firstShapeDifference(actual[key], expected[key], `${path}.${key}`);
      if (difference) return difference;
    }
    return undefined;
  }
  return { path, actual, expected };
}

function dataPath(element: any): string {
  const value = element.attr('data-sanity');
  assert.ok(value, 'preview element should contain a data-sanity attribute');
  const decoded = decodeSanityNodeData(value);
  assert.ok(decoded && 'path' in decoded);
  return String(decoded.path);
}

function testImage(): SanityImage {
  return {
    _type: 'image',
    asset: {
      _type: 'reference',
      _ref: 'image-0123456789abcdef01234567-2000x1000-webp',
      metadata: { dimensions: { width: 2000, height: 1000, aspectRatio: 2 } },
    },
    alt: 'Nested alt must not duplicate the CMS control',
    crop: { top: 0.05, bottom: 0.05, left: 0.1, right: 0.1 },
    hotspot: { x: 0.7, y: 0.25, width: 0.4, height: 0.5 },
  };
}

test('all 37 full-site pages preserve source DOM, body identity, head styles, and script order', async () => {
  assert.equal(SITE_PAGE_MANIFEST.length, 37);
  for (const entry of SITE_PAGE_MANIFEST) {
    const source = LEGACY_TEMPLATES[entry.pageKey];
    const sourceDom = load(source, { scriptingEnabled: true });
    const sourceBody = sourceDom('body').first();
    assert.ok(sourceBody.length, `${entry.pageKey} source should have a body`);
    sourceBody.find('script').remove();

    const shell = getLegacyPageShell(entry.pageKey);
    assert.equal(shell.bodyClass, sourceBody.attr('class') || '', `${entry.pageKey} body class`);
    assert.equal(shell.htmlLang, sourceDom('html').attr('lang') || 'en', `${entry.pageKey} language`);
    const sourceScripts = sourceDom('script[src]').toArray().map((script) => sourceDom(script).attr('src'));
    assert.deepEqual(shell.scripts.map((script) => script.src), sourceScripts, `${entry.pageKey} script order`);

    const page = pageFixture(entry.pageKey);
    const rendered = renderToStaticMarkup(renderLegacyPageBody(entry.pageKey, page, null, false));
    const renderedDom = parseFragment(rendered);
    const sourceShape = domShape(sourceBody.contents().toArray());
    // React may emit image preload hints before the component markup; the full Next response hoists these into head.
    const renderedNodes = renderedDom.root().contents().toArray().filter((node) =>
      !(node.type === 'tag' && node.tagName === 'link' && node.attribs?.rel === 'preload' && node.attribs?.as === 'image'),
    );
    const renderedShape = domShape(renderedNodes);
    const domDifference = firstShapeDifference(renderedShape, sourceShape);
    assert.equal(domDifference, undefined, `${entry.pageKey} rendered DOM differs: ${JSON.stringify(domDifference)}`);

    const originalHead = sourceDom('head').clone();
    originalHead.children('title,meta[charset],meta[name="viewport"],meta[name="description"],meta[property^="og:"]').remove();
    originalHead.find('script').remove();
    originalHead.find('link[rel]').filter((_, element) =>
      (sourceDom(element).attr('rel') || '').toLowerCase().split(/\s+/).includes('canonical'),
    ).remove();
    originalHead.find('meta[name],meta[property]').filter((_, element) => {
      const node = sourceDom(element);
      const name = node.attr('name')?.toLowerCase() || '';
      const property = node.attr('property')?.toLowerCase() || '';
      return /^(?:robots|googlebot|twitter(?:-.*)?)$/.test(name) || name.startsWith('twitter:') || property.startsWith('twitter:');
    }).remove();
    const normalizedOriginalHead = domShape(originalHead.contents().toArray().filter((node) => node.type !== 'text' || String(node.data ?? '').trim()));
    const shellHead = parseFragment(shell.headHtml);
    assert.deepEqual(domShape(shellHead.root().contents().toArray().filter((node) => node.type !== 'text' || String(node.data ?? '').trim())), normalizedOriginalHead, `${entry.pageKey} non-SEO head styles`);
    assert.equal(shellHead('link[rel~="canonical"]').length, 0, `${entry.pageKey} canonical is delegated to Next`);
    assert.equal(shellHead('meta[name="robots"],meta[name="googlebot"],meta[name^="twitter:"],meta[property^="twitter:"]').length, 0, `${entry.pageKey} robots and Twitter metadata are delegated to Next`);

    const metadata = await getSitePageMetadata(page, entry.route, shell.metadata);
    assert.equal(metadata.alternates?.canonical, shell.metadata.canonicalPath ?? entry.route, `${entry.pageKey} canonical pathname`);
  }
});

test('404 Route Handler returns the complete legacy document with noindex and original resources', async () => {
  const page = pageFixture('404');
  const settings = buildSettingsFixture();
  const shell = getLegacyPageShell('404');
  const metadata = await getSitePageMetadata(page, '/404.html', shell.metadata);
  const catalogData: CatalogData = { products: [], categories: [], styles: [], revision: '</script><img src=x>' };
  const response = createNotFoundPageResponse({ page, settings, catalogData, metadata });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');

  const markup = await response.text();
  const $ = load(markup);
  const sourceHead = parseFragment(shell.headHtml);
  assert.equal($('html').attr('lang'), shell.htmlLang);
  assert.equal($('body').attr('class'), shell.bodyClass);
  assert.ok($('body h1').first().text().trim(), '404 should render visible legacy page content');
  assert.equal($('head link[rel~="canonical"]').length, 1, 'the original canonical path is emitted once');
  assert.equal(new URL($('head link[rel~="canonical"]').attr('href')!, 'https://netpro.example.test').pathname, shell.metadata.canonicalPath ?? '/404.html');
  assert.equal($('head meta[name="robots"]').attr('content'), 'noindex, nofollow, noarchive');
  assert.equal($('head meta[name^="twitter:"]').length > 0, true);
  assert.equal($('head meta[property^="og:"]').length > 0, true);
  assert.equal($('[data-sanity]').length, 0, 'public 404 HTML must not contain Visual Editing bindings');
  assert.equal(markup.includes('<img src=x>'), false, 'catalog JSON must escape script-closing content');

  const expectedStyles = sourceHead('link[rel]').toArray()
    .filter((element) => (sourceHead(element).attr('rel') || '').toLowerCase().split(/\s+/).includes('stylesheet'))
    .map((element) => rootReference(sourceHead(element).attr('href')));
  const actualStyles = $('head link[rel]').toArray()
    .filter((element) => ($(element).attr('rel') || '').toLowerCase().split(/\s+/).includes('stylesheet'))
    .map((element) => $(element).attr('href'));
  assert.deepEqual(actualStyles, expectedStyles, '404 should retain the original stylesheet order');

  const expectedScripts = getLegacyScripts('404', { catalogBootstrap: true }).map((script) => rootReference(script.src));
  const actualScripts = $('body script[src]').toArray().map((script) => $(script).attr('src'));
  assert.deepEqual(actualScripts, expectedScripts, 'legacy scripts keep the source order while old product loaders are omitted');
  const references = $('head [href], body [href], body [src], body [poster]').toArray()
    .flatMap((element) => ['href', 'src', 'poster'].map((attribute) => $(element).attr(attribute)).filter((value): value is string => value !== undefined));
  for (const reference of references) {
    assert.ok(rootReference(reference) === reference, 'local references should already be rooted for nested URLs: ' + reference);
    if (/^(?:#|\/\/|[a-z][a-z0-9+.-]*:)/i.test(reference.trim())) continue;
    assert.equal(new URL(reference, 'https://netpro.example.test/nested/missing/page').pathname.startsWith('/nested/'), false, 'nested 404 URLs must not capture local assets or site links');
  }
  const cssTexts = $('body [style]').toArray().map((element) => $(element).attr('style') || '')
    .concat($('style').toArray().map((element) => $(element).text()));
  for (const css of cssTexts) {
    for (const match of css.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi)) {
      const reference = (match[2] ?? match[3] ?? '').trim();
      assert.ok(rootReference(reference) === reference, 'inline CSS URLs should be root-relative for nested URLs: ' + reference);
    }
  }
  assert.ok(markup.indexOf('id="netpro-catalog-bootstrap"') < markup.indexOf('src="' + expectedScripts[0] + '"'));

  const headResponse = createNotFoundPageResponse({ page, settings, catalogData, metadata }, false);
  assert.equal(headResponse.status, 404);
  assert.equal(await headResponse.text(), '', 'HEAD responses contain no response body');
});
test('shared About navigation label reaches desktop and mobile controls with one edit path', () => {
  const settings = buildSettingsFixture();
  const slot = settings.navigation?.slots.find((item) => item.bindingId === 'header-about');
  assert.ok(slot);
  slot.linkLabel = 'Our Story CMS label';
  const body = getLegacyPageShell('about').bodyHtml;
  const $ = parseFragment(applySiteHeaderSettings(body, settings, true));
  const desktop = $('header button.nav-trigger[aria-controls="nav-panel-2"]');
  const mobile = $('header .mobile-nav details').filter((_, element) => $(element).find('a[href="about.html"]').length > 0).find('summary');
  assert.equal(desktop.text().replace(/\s+/g, ' ').trim(), 'Our Story CMS label');
  assert.equal(mobile.text().replace(/\s+/g, ' ').trim(), 'Our Story CMS label');
  assert.ok(dataPath(desktop).includes('navigation'));
  assert.ok(dataPath(mobile).includes('navigation'));
});

test('catalog bootstrap is required before each legacy catalog consumer and replaces legacy product loaders', () => {
  for (const pageKey of ['about', 'custom-hoodies', 'custom-backpacks', 'quote']) {
    assert.equal(requiresCatalogBootstrap(pageKey), true, `${pageKey} consumes the legacy app/catalog data`);
    const original = getLegacyScripts(pageKey);
    const bootstrapped = getLegacyScripts(pageKey, { catalogBootstrap: true });
    assert.ok(bootstrapped.some((script) => /(?:^|\/)app\.js(?:\?|$)/i.test(script.src)) || bootstrapped.some((script) => /(?:^|\/)quote\.js(?:\?|$)/i.test(script.src)));
    assert.ok(!bootstrapped.some((script) => /(?:^|\/)(?:products|purchase-products)\.js(?:\?|$)/i.test(script.src)));
    assert.deepEqual(bootstrapped, original.filter((script) => !/(?:^|\/)(?:products|purchase-products)\.js(?:\?|$)/i.test(script.src)));
  }
});

test('preview bindings use real page IDs and text edits do not overwrite nested card headings', () => {
  const pageKey = 'custom-hoodies';
  const baseTemplate = LEGACY_TEMPLATES[pageKey];
  const baseBindings = PAGE_BINDINGS[pageKey];
  const template = baseTemplate.replace('</main>', `<section class="fixture-card"><a class="fixture-complex" href="#old"><h2>Source heading</h2><p>Before <strong>middle</strong> after<br><span aria-hidden="true">↗</span></p></a><a class="fixture-cta" href="#cta">Old <span aria-hidden="true">↗</span></a></section><div class="fixture-option" data-headwear-options><button type="button" role="tab" data-option-image="/old.webp" data-option-title="Option" data-option-copy="Option copy">Option tab</button><div class="custom-option-image" data-option-image="/stage.webp" role="img" aria-label="Old stage" style="background-image:url('/old.webp')"></div></div></main>`);
  const sectionId = baseBindings[0]!.sectionId;
  const syntheticBindings: GeneratedPageBinding[] = [
    { slotId: 'slot-test-card-title', sectionId, sectionLabel: '页面模块 · 测试卡片', label: '测试卡片标题', kind: 'text', selector: '.fixture-complex h2', textNodePath: '0', text: 'Source heading' },
    { slotId: 'slot-test-card-first', sectionId, sectionLabel: '页面模块 · 测试卡片', label: '测试卡片正文', kind: 'text', selector: '.fixture-complex p', textNodePath: '0', text: 'Before ' },
    { slotId: 'slot-test-card-strong', sectionId, sectionLabel: '页面模块 · 测试卡片', label: '强调文字', kind: 'text', selector: '.fixture-complex strong', textNodePath: '0', text: 'middle' },
    { slotId: 'slot-test-card-last', sectionId, sectionLabel: '页面模块 · 测试卡片', label: '正文补充', kind: 'text', selector: '.fixture-complex p', textNodePath: '2', text: ' after' },
    { slotId: 'slot-test-complex-link', sectionId, sectionLabel: '页面模块 · 测试卡片', label: '卡片链接', kind: 'link', selector: '.fixture-complex', href: '#old', editableLinkLabel: false },
    { slotId: 'slot-test-simple-cta', sectionId, sectionLabel: '页面模块 · 测试卡片', label: '测试按钮', kind: 'link', selector: '.fixture-cta', href: '#cta', linkLabel: 'Old', editableLinkLabel: true },
    { slotId: 'slot-test-option', sectionId, sectionLabel: '页面模块 · 测试卡片', label: '选项图', kind: 'image', selector: '.fixture-option [role="tab"]', target: 'option', sourcePath: '/old.webp', alt: 'Old option' },
  ];
  const bindings = [...baseBindings, ...syntheticBindings];
  LEGACY_TEMPLATES[pageKey] = template;
  PAGE_BINDINGS[pageKey] = bindings;
  try {
    const page = buildSitePageDocuments(LEGACY_TEMPLATES, PAGE_BINDINGS).find((document) => document._id === 'sitePage-custom-hoodies') as unknown as SitePageDocument;
    page._rev = 'fixture-rev';
    slotFor(page, 'slot-test-card-title').text = 'Updated CMS heading';
    slotFor(page, 'slot-test-card-first').text = 'Updated first sentence ';
    slotFor(page, 'slot-test-card-strong').text = 'new emphasis';
    slotFor(page, 'slot-test-card-last').text = ' and ending';
    slotFor(page, 'slot-test-complex-link').href = '#new';
    slotFor(page, 'slot-test-simple-cta').linkLabel = 'New CTA';
    slotFor(page, 'slot-test-option').image = testImage();
    slotFor(page, 'slot-test-option').alt = 'New option alt';

    const markup = renderToStaticMarkup(renderLegacyPageBody(pageKey, page, null, true));
    const $ = parseFragment(markup);
    assert.equal($('.fixture-complex h2').text(), 'Updated CMS heading', 'complex anchor label must not overwrite its independently editable heading');
    assert.equal($('.fixture-complex').attr('href'), '#new');
    assert.equal($('.fixture-complex p').text().replace(/\s+/g, ' ').trim(), 'Updated first sentence new emphasis and ending↗');
    assert.equal($('.fixture-complex p strong').text(), 'new emphasis');
    assert.equal($('.fixture-complex p br').length, 1);
    assert.equal($('.fixture-complex p [aria-hidden="true"]').text(), '↗');
    assert.equal($('.fixture-complex p').attr('data-sanity')?.includes('slot-test-card-first'), true, 'only the first text node mapped to a paragraph should own its marker');
    assert.equal($('.fixture-complex p').attr('data-sanity')?.includes('slot-test-card-last'), false);
    assert.ok($('.fixture-complex strong').attr('data-sanity')?.includes('slot-test-card-strong'));
    assert.ok($('.fixture-complex h2').attr('data-sanity')?.includes('slot-test-card-title'));
    assert.ok(dataPath($('.fixture-complex')).includes('href'));
    const visibleCta = $('.fixture-cta').clone();
    visibleCta.find('[aria-hidden="true"],svg').remove();
    assert.equal(visibleCta.text().replace(/\s+/g, ' ').trim(), 'New CTA');
    assert.equal($('.fixture-cta [aria-hidden="true"]').length, 1, 'simple CTA edit preserves its decorative arrow exactly once');
    assert.ok($('.fixture-cta').attr('data-sanity')?.includes('linkLabel'));
    assert.equal($('.fixture-option [role="tab"]').attr('data-option-size'), 'cover');
    assert.equal($('.fixture-option [role="tab"]').attr('data-option-position'), '70% 25%');
    const optionStageStyle = normalizedStyle($('.fixture-option .custom-option-image').attr('style') || '');
    assert.ok(optionStageStyle.includes('background-size:cover'));
    assert.ok(optionStageStyle.includes('background-position:70% 25%'));
    assert.equal($('.fixture-option .custom-option-image').attr('aria-label'), 'New option alt');
    assert.ok($('.fixture-option [role="tab"]').attr('data-sanity')?.includes('slot-test-option'));

    const fakeIdMarkup = renderToStaticMarkup(renderLegacyPageBody(pageKey, { ...page, _id: 'sitePage' }, null, true));
    assert.equal(parseFragment(fakeIdMarkup)('[data-sanity]').length, 0, 'the schema type name is not a document identity');
  } finally {
    LEGACY_TEMPLATES[pageKey] = baseTemplate;
    PAGE_BINDINGS[pageKey] = baseBindings;
  }
});

test('Sanity image replacements preserve source labels, honor hotspot crop, and keep local background treatments', () => {
  const galleryPage = mutablePageFixture('custom-backpacks');
  const galleryBinding = PAGE_BINDINGS['custom-backpacks'].find((binding) => binding.kind === 'image' && binding.target === 'gallery');
  assert.ok(galleryBinding);
  const originalGalleryLabel = load(LEGACY_TEMPLATES['custom-backpacks'])(galleryBinding.selector).attr('data-label');
  const gallerySlot = slotFor(galleryPage, galleryBinding.slotId);
  gallerySlot.image = testImage();
  gallerySlot.alt = 'CMS gallery image';
  const galleryMarkup = renderToStaticMarkup(renderLegacyPageBody('custom-backpacks', galleryPage, null, true));
  const galleryDom = parseFragment(galleryMarkup);
  const galleryTarget = galleryDom(galleryBinding.selector);
  assert.equal(galleryTarget.attr('data-image-size'), 'cover');
  assert.equal(galleryTarget.attr('data-position'), '70% 25%');
  assert.equal(galleryTarget.attr('data-alt'), 'CMS gallery image');
  assert.equal(galleryTarget.attr('data-label'), originalGalleryLabel, 'the gallery caption label is distinct from the image alt');
  assert.ok(normalizedStyle(galleryTarget.find('.custom-product-thumb-art').attr('style') || '').includes('background-size:cover'));
  assert.ok(galleryTarget.attr('data-sanity')?.includes(galleryBinding.slotId));

  const inlineEntry = SITE_PAGE_MANIFEST.find((entry) => PAGE_BINDINGS[entry.pageKey].some((binding) => binding.kind === 'image' && binding.target === 'inline-background'));
  assert.ok(inlineEntry);
  const inlineBinding = PAGE_BINDINGS[inlineEntry.pageKey].find((binding) => binding.kind === 'image' && binding.target === 'inline-background')!;
  const inlinePage = mutablePageFixture(inlineEntry.pageKey);
  const inlineSlot = slotFor(inlinePage, inlineBinding.slotId);
  inlineSlot.image = testImage();
  inlineSlot.alt = 'CMS editorial image';
  const inlineDom = parseFragment(renderToStaticMarkup(renderLegacyPageBody(inlineEntry.pageKey, inlinePage, null, true)));
  const inlineStyle = normalizedStyle(inlineDom(inlineBinding.selector).attr('style') || '');
  assert.ok(inlineStyle.includes('background-size:cover'));
  assert.ok(inlineStyle.includes('background-position:70% 25%'));

  const aboutPage = mutablePageFixture('about');
  const aboutBinding = PAGE_BINDINGS.about.find((binding) => binding.kind === 'image' && binding.target === 'background');
  assert.ok(aboutBinding);
  slotFor(aboutPage, aboutBinding.slotId).image = testImage();
  const aboutMarkup = renderToStaticMarkup(renderLegacyPageBody('about', aboutPage, null, false));
  const aboutDom = parseFragment(aboutMarkup);
  assert.ok(normalizedStyle(aboutDom(aboutBinding.selector).attr('style') || '').includes('--cms-about-hero-image-position:70% 25%'));
  assert.match(aboutMarkup, /data-site-page-image-overrides/);
  assert.match(aboutMarkup, /linear-gradient\(/);
  assert.match(aboutMarkup, /var\(--cms-about-hero-image\)/);

  const contactPage = mutablePageFixture('contact');
  const contactBinding = PAGE_BINDINGS.contact.find((binding) => binding.kind === 'image' && binding.target === 'background');
  assert.ok(contactBinding);
  slotFor(contactPage, contactBinding.slotId).image = testImage();
  const contactMarkup = renderToStaticMarkup(renderLegacyPageBody('contact', contactPage, null, false));
  assert.match(contactMarkup, /\.contact-page \.contact-layout:before/);
  assert.doesNotMatch(contactMarkup, /(?:^|})\s*(?:body|\.contact-page)\s*\{/);
});

test('gallery and option scripts mirror Visual Editing paths onto the live image surfaces', () => {
  const source = readFileSync(new URL('../custom-products.js', import.meta.url), 'utf8');
  const dom = new JSDOM(`<!doctype html><body>
    <section data-custom-product-gallery>
      <div data-gallery-view></div><div data-gallery-caption></div><div data-gallery-status></div>
      <button data-gallery-open></button><dialog data-gallery-dialog open><div data-lightbox-view></div><div data-lightbox-caption></div><button data-lightbox-close></button><button data-lightbox-previous></button><button data-lightbox-next></button></dialog>
      <button data-gallery-thumb data-image="/a.webp" data-label="Style A" data-alt="A" data-sanity="path-a"></button>
      <button data-gallery-thumb data-image="/b.webp" data-label="Style B" data-alt="B" data-sanity="path-b"></button>
    </section>
    <section data-headwear-options>
      <button role="tab" id="option-tab" data-option-image="/option.webp" data-option-title="Option" data-option-copy="Copy" data-option-alt="Option image" data-sanity="path-option"></button>
      <div role="tabpanel" aria-labelledby=""></div><div data-option-heading></div><div data-option-description></div>
      <div class="custom-option-image" data-option-image="/stage.webp" role="img"></div>
    </section>
  </body>`, { runScripts: 'outside-only' });
  try {
    dom.window.eval(source);
    const gallery = dom.window.document.querySelector('[data-custom-product-gallery]')!;
    const thumbs = gallery.querySelectorAll('[data-gallery-thumb]');
    thumbs[1]!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(gallery.querySelector('[data-gallery-view]')?.getAttribute('data-sanity'), 'path-b');
    assert.equal(gallery.querySelector('[data-lightbox-view]')?.getAttribute('data-sanity'), 'path-b');
    assert.equal(gallery.querySelector('[data-gallery-caption]')?.textContent, 'Style B');
    const optionWidget = dom.window.document.querySelector('[data-headwear-options]')!;
    optionWidget.querySelector('[role="tab"]')?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(optionWidget.querySelector('.custom-option-image')?.getAttribute('data-sanity'), 'path-option');
    assert.equal(optionWidget.querySelector('.custom-option-image')?.getAttribute('aria-label'), 'Option image');
  } finally {
    dom.window.close();
  }
});
