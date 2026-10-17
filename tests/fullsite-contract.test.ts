import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { load } from 'cheerio';
import { templateSnapshotsMatch } from '../scripts/build-page-bindings';
import { buildFullsiteSeedDocuments, buildSitePageDocuments, buildSiteSettingsDocument } from '../scripts/seed-pages';
import { checkFullsiteContract } from '../src/fullsite/contracts';
import { LEGACY_TEMPLATES } from '../src/fullsite/legacyTemplates.generated';
import { PAGE_BINDINGS } from '../src/fullsite/pageBindings.generated';
import { CHECKOUT_REDIRECT_ROUTE, SITE_PAGE_MANIFEST } from '../src/fullsite/pageManifest';
import { sitePageQuery } from '../src/fullsite/query';
import { SITE_FOOTER_LINK_BINDINGS, SITE_HEADER_BINDINGS } from '../src/fullsite/siteSettingsBindings';
import { sitePage, validateSitePageTextLines } from '../src/sanity/schemaTypes/sitePage';
import { siteSettings } from '../src/sanity/schemaTypes/siteSettings';
import { validateSlotHref } from '../src/sanity/schemaTypes/validation';

type SchemaNode = { name?: string; type?: string; hidden?: boolean | ((context: { parent?: Record<string, unknown> }) => boolean); readOnly?: boolean; title?: string; options?: Record<string, unknown>; description?: string; fields?: SchemaNode[]; of?: SchemaNode[] };

function schemaNodes(node: SchemaNode): SchemaNode[] {
  return [node, ...(node.fields ?? []).flatMap(schemaNodes), ...(node.of ?? []).flatMap(schemaNodes)];
}

function cloneSchema(node: SchemaNode): SchemaNode {
  return {
    ...node,
    ...(node.fields ? { fields: node.fields.map(cloneSchema) } : {}),
    ...(node.of ? { of: node.of.map(cloneSchema) } : {}),
  };
}

function hasBlockContent($: ReturnType<typeof load>, element: any): boolean {
  return $(element).find('h1,h2,h3,h4,h5,h6,p,ul,ol,li,blockquote,figure,section,article,div,table,dl,dt,dd,form').length > 0;
}

function visibleTextNodeCount($: ReturnType<typeof load>, element: any): number {
  const clone = $(element).clone();
  clone.find('svg,[aria-hidden="true"]').remove();
  let count = 0;
  const visit = (node: any) => {
    if (node.type === 'text') { if (String(node.data ?? '').trim()) count++; return; }
    for (const child of node.children ?? []) visit(child);
  };
  visit(clone.get(0));
  return count;
}

test('controlled source snapshots ignore line-ending convention only', () => {
  const windowsHtml = '<main>\r\n  <p>Original copy</p>\r\n</main>\r\n';
  const linuxHtml = windowsHtml.replace(/\r\n/g, '\n');
  assert.equal(templateSnapshotsMatch(windowsHtml, linuxHtml), true, 'LF and CRLF source snapshots represent the same HTML');
  assert.equal(templateSnapshotsMatch(windowsHtml, linuxHtml.replace('Original copy', 'Changed copy')), false, 'real source-text edits must still fail the snapshot check');
  assert.equal(templateSnapshotsMatch('<main>one\n\nthree</main>', '<main>one\nthree</main>'), false, 'normalization must not collapse whitespace or remove lines');
});

test('37 fixed page identities and checkout redirect remain registered', () => {
  assert.equal(SITE_PAGE_MANIFEST.length, 37);
  assert.equal(new Set(SITE_PAGE_MANIFEST.map((page) => page.route)).size, 37);
  assert.equal(new Set(SITE_PAGE_MANIFEST.map((page) => page.docId)).size, 37);
  assert.deepEqual(CHECKOUT_REDIRECT_ROUTE, { route: '/checkout.html', destination: '/quote.html' });
  assert.ok(!SITE_PAGE_MANIFEST.some((page) => (page.route as string) === CHECKOUT_REDIRECT_ROUTE.route));
});

test('fixed page bindings resolve to one source node and keep complex links href-only', () => {
  let linkCount = 0;
  let complexLinkCount = 0;
  let simpleLabelCount = 0;
  for (const page of SITE_PAGE_MANIFEST) {
    const html = LEGACY_TEMPLATES[page.pageKey];
    const bindings = PAGE_BINDINGS[page.pageKey];
    assert.ok(html, `${page.pageKey} should have a controlled legacy template`);
    assert.ok(bindings.length, `${page.pageKey} should have fixed content bindings`);
    const $ = load(html);
    const slotIds = new Set<string>();
    for (const binding of bindings) {
      assert.ok(binding.slotId && binding.sectionId);
      assert.ok(!slotIds.has(binding.slotId), `${page.pageKey} should not repeat ${binding.slotId}`);
      slotIds.add(binding.slotId);
      assert.equal($(binding.selector).length, 1, `${page.pageKey} selector ${binding.selector} must stay unique`);
      assert.match(binding.sectionLabel, /\p{Script=Han}/u, `${page.pageKey} module labels must be Chinese`);
      if (binding.kind === 'text' && binding.textNodePath) {
        let textNode: any = $(binding.selector).get(0);
        for (const index of binding.textNodePath.split('.').map(Number)) textNode = textNode?.children?.[index];
        assert.equal(textNode?.type, 'text', `${page.pageKey} text node path ${binding.textNodePath} must resolve`);
      }
      if (binding.kind !== 'link') continue;
      linkCount++;
      const anchor = $(binding.selector).get(0)!;
      if (hasBlockContent($, anchor) || visibleTextNodeCount($, anchor) > 1) {
        complexLinkCount++;
        assert.equal(binding.editableLinkLabel, false, `${page.pageKey} complex anchor should be href-only`);
        assert.equal(binding.linkLabel, undefined, `${page.pageKey} complex anchor must not aggregate nested copy`);
      } else {
        assert.equal(binding.editableLinkLabel, true, `${page.pageKey} CTA label editability should be explicit`);
        if (binding.linkLabel) simpleLabelCount++;
      }
    }
  }
  assert.ok(linkCount > 0);
  assert.ok(complexLinkCount > 0);
  assert.ok(simpleLabelCount > 0);
});

test('schema exposes Chinese editor content while hiding fixed implementation fields', () => {
  const allFields = schemaNodes(sitePage as unknown as SchemaNode);
  const field = (name: string) => allFields.find((node) => node.name === name);
  for (const name of ['pageKey', 'route', 'kind', 'selector', 'textNodePath', 'sourcePath', 'editableLinkLabel']) {
    assert.equal(field(name)?.hidden, true, `${name} is implementation metadata and should stay hidden`);
  }
  const linkLabel = field('linkLabel');
  assert.equal(typeof linkLabel?.hidden, 'function');
  if (typeof linkLabel?.hidden === 'function') {
    assert.equal(linkLabel.hidden({ parent: { kind: 'link', editableLinkLabel: false } }), true);
    assert.equal(linkLabel.hidden({ parent: { kind: 'link', editableLinkLabel: true } }), false);
  }
  assert.equal(field('sections')?.title, '页面模块与内容');
  assert.equal((sitePage as unknown as { groups: Array<{ name: string; default?: boolean }> }).groups.find((group) => group.name === 'content')?.default, true, 'the Studio should open on editable page content');
  assert.equal(field('text')?.title, '文字内容');
  assert.equal(field('image')?.title, '替换图片');
  const textLines = field('textLines');
  assert.equal(textLines?.description, '保持原版行数与顺序；仅修改各行文字。');
  assert.equal(textLines?.options?.sortable, false);
  assert.ok((textLines?.options?.disableActions as string[]).includes('remove'));
  assert.ok((textLines?.options?.disableActions as string[]).includes('add'));

  const seededLines = buildSitePageDocuments().flatMap((page) => (page.sections as Array<{ slots: Array<{ kind: string; slotId: string; textMode?: string; textLines?: string[] }> }>).flatMap((section) => section.slots)).filter((slot) => slot.kind === 'text' && slot.textMode === 'lines');
  assert.ok(seededLines.length > 0);
  for (const slot of seededLines) assert.equal(validateSitePageTextLines(slot.textLines, { parent: slot }), true, `${slot.slotId} seeded lines should satisfy the fixed row contract`);
  assert.equal(validateSitePageTextLines(undefined, { parent: { kind: 'text', textMode: 'plain' } }), true, 'hidden textLines must not require values for plain text slots');
  const lineSlot = seededLines[0]!;
  assert.notEqual(validateSitePageTextLines(undefined, { parent: lineSlot }), true, 'line-formatted title still requires its fixed source line count');
  assert.notEqual(validateSitePageTextLines([...lineSlot.textLines!].slice(1), { parent: lineSlot }), true, 'removing a source title line is invalid');
});

test('first full-site seed builds 37 pages and shared settings without touching homePage', () => {
  const pages = buildSitePageDocuments();
  const settings = buildSiteSettingsDocument();
  const documents = buildFullsiteSeedDocuments();
  assert.equal(pages.length, 37);
  assert.deepEqual(pages.map((document) => document._id), SITE_PAGE_MANIFEST.map((page) => page.docId));
  assert.equal(documents.some((document) => document._id === 'homePage' || document._id === 'drafts.homePage'), false);
  assert.equal(settings._id, 'siteSettings');

  for (const page of pages) {
    const source = SITE_PAGE_MANIFEST.find((entry) => entry.docId === page._id)!;
    const groups = page.sections as Array<{ _key: string; sectionId: string; label: string; slots: Array<{ _key: string; slotId: string; kind: string; editableLinkLabel?: boolean; linkLabel?: string }> }>;
    assert.equal(new Set(groups.map((section) => section.label)).size, groups.length, `${source.pageKey} module labels should distinguish editor sections`);
    assert.ok(groups.every((section) => /\p{Script=Han}/u.test(section.label)), `${source.pageKey} module labels should be Chinese`);
    const expected = PAGE_BINDINGS[source.pageKey];
    assert.equal(groups.reduce((count, section) => count + section.slots.length, 0), expected.length);
    for (const binding of expected) {
      const section = groups.find((candidate) => candidate.sectionId === binding.sectionId);
      const slot = section?.slots.find((candidate) => candidate.slotId === binding.slotId);
      assert.ok(section && slot, `${source.pageKey} should retain fixed IDs during seed construction`);
      assert.equal(section._key, binding.sectionId);
      assert.equal(slot._key, binding.slotId);
      if (binding.kind === 'link' && binding.editableLinkLabel === false) assert.equal(slot.linkLabel, undefined);
    }
  }

  const navigation = settings.navigation as { slots: Array<{ _key: string; bindingId: string }> };
  assert.deepEqual(navigation.slots.map((slot) => slot.bindingId), SITE_HEADER_BINDINGS.map((binding) => binding.bindingId));
  assert.ok(navigation.slots.every((slot) => slot._key === slot.bindingId));
  const footer = settings.footer as { columns: Array<{ slug: string; links: Array<{ slug: string; _key: string }> }> };
  assert.deepEqual(footer.columns.flatMap((column) => column.links.map((link) => link.slug)), SITE_FOOTER_LINK_BINDINGS.map((binding) => binding.slug));
  assert.ok(footer.columns.every((column) => column.links.every((link) => link._key === link.slug)));
});

test('page data query keeps the complete singleton and public sync excludes migrated HTML', () => {
  assert.match(sitePageQuery, /^\*\[_type == "sitePage" && pageKey == \$pageKey\]\[0\]$/);
  const sync = readFileSync(new URL('../scripts/sync-legacy-public.mjs', import.meta.url), 'utf8');
  assert.match(sync, /migratedHtmlRoutes/);
  assert.match(sync, /filter\(\(file\) => !isMigratedHtml\(file\)\)/);
  assert.match(sync, /checkout redirect is missing from the migrated route set/);
  assert.match(sync, /Root HTML files are not covered by the App Router manifest/);
  const legacyManifest = JSON.parse(readFileSync(new URL('../scripts/legacy-public-manifest.json', import.meta.url), 'utf8')) as { files: string[] };
  const sourceHtml = legacyManifest.files.filter((file) => !file.includes('/') && file.endsWith('.html') && file !== 'index.html').sort();
  const migratedHtml = [...SITE_PAGE_MANIFEST.map((page) => page.route.slice(1)), CHECKOUT_REDIRECT_ROUTE.route.slice(1)].sort();
  assert.deepEqual(migratedHtml, sourceHtml, 'every legacy root HTML route must be excluded from public asset sync');

  const layout = readFileSync(new URL('../app/(legacy)/[legacyPage]/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /export const dynamic\s*=\s*["']force-dynamic["']/, 'CMS page render and metadata should run on requests');
  assert.match(layout, /dynamicParams\s*=\s*false/, 'unknown one-segment paths should reach global-not-found instead of the fallback page');
  const staticParamsBody = layout.match(/export function generateStaticParams\(\)\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(staticParamsBody, 'the allowlist should be returned from generateStaticParams');
  assert.match(staticParamsBody, /SITE_PAGE_MANIFEST\.map\(\(\{ route \}\) => \(\{ legacyPage: route\.slice\(1\) \}\)\)/);
  assert.match(staticParamsBody, /CHECKOUT_REDIRECT_ROUTE\.route\.slice\(1\)/);
  assert.doesNotMatch(staticParamsBody, /getSitePageData|fetch\(/, 'the route allowlist must stay local and not query Sanity during build');
  const allowedLegacyPages = [...SITE_PAGE_MANIFEST.map((page) => page.route.slice(1)), CHECKOUT_REDIRECT_ROUTE.route.slice(1)];
  assert.equal(allowedLegacyPages.length, 38, 'the allowlist includes 37 content routes and checkout');
  assert.equal(new Set(allowedLegacyPages).size, allowedLegacyPages.length, 'the generated route allowlist must not contain duplicates');
  assert.ok(!allowedLegacyPages.includes('this-page-does-not-exist.html'));
  const metadataStart = layout.indexOf('export async function generateMetadata');
  const layoutBodyStart = layout.indexOf('export default async function LegacyRootLayout');
  const metadataBody = layout.slice(metadataStart, layoutBodyStart);
  assert.ok(metadataBody.indexOf('await connection()') >= 0 && metadataBody.indexOf('await connection()') < metadataBody.indexOf('getSitePageData'), 'page metadata CMS reads must be behind the request boundary');
  const nextConfig = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
  assert.match(nextConfig, /globalNotFound\s*:\s*true/, 'the app has multiple root layouts, so unmatched paths need a complete global 404 document');
  const globalNotFound = readFileSync(new URL('../app/global-not-found.tsx', import.meta.url), 'utf8');
  assert.match(globalNotFound, /renderGlobalLegacyNotFoundDocument/);
  assert.match(globalNotFound, /getLegacyNotFoundData/);
  const notFoundHelpers = readFileSync(new URL('../app/(legacy)/LegacyNotFound.tsx', import.meta.url), 'utf8');
  const dataHelperStart = notFoundHelpers.indexOf('export async function getLegacyNotFoundData');
  const metadataHelperStart = notFoundHelpers.indexOf('export async function getLegacyNotFoundMetadata');
  const bodyHelperStart = notFoundHelpers.indexOf('export function renderLegacyNotFoundBody');
  const dataHelper = notFoundHelpers.slice(dataHelperStart, metadataHelperStart);
  const metadataHelper = notFoundHelpers.slice(metadataHelperStart, bodyHelperStart);
  assert.ok(dataHelperStart >= 0 && metadataHelperStart > dataHelperStart && bodyHelperStart > metadataHelperStart);
  assert.ok(dataHelper.indexOf('await connection()') >= 0 && dataHelper.indexOf('await connection()') < dataHelper.indexOf('getSitePageData'), '404 page and settings reads must begin after the request boundary');
  assert.ok(metadataHelper.indexOf('await connection()') >= 0 && metadataHelper.indexOf('await connection()') < metadataHelper.indexOf('getSitePageData'), '404 metadata reads must begin after the request boundary');
});

test('hidden non-link slot hrefs may be absent while link hrefs remain protocol-validated', () => {
  for (const value of [undefined, null, '']) {
    assert.equal(validateSlotHref(value, { parent: { kind: 'text' } }), true);
    assert.notEqual(validateSlotHref(value, { parent: { kind: 'link' } }), true);
  }
  assert.equal(validateSlotHref('about.html', { parent: { kind: 'link' } }), true);
  assert.notEqual(validateSlotHref('javascript:alert(1)', { parent: { kind: 'link' } }), true);
  assert.notEqual(validateSlotHref('javascript:alert(1)', { parent: { kind: 'text' } }), true, 'stale hidden hrefs must remain safe if present');
});

test('fullsite renderer and query fields resolve through the complete nested Sanity schemas', () => {
  assert.deepEqual(checkFullsiteContract(), []);
  const errors = checkFullsiteContract({ pageQuery: '*[_type == "sitePage"][0]{seo}' });
  assert.ok(errors.some((error) => error.includes('full page document')));
});

test('fullsite contract catches removed text, alt, and nested footer href schema fields', () => {
  const pageSchema = cloneSchema(sitePage as unknown as SchemaNode);
  const sections = pageSchema.fields?.find((field) => field.name === 'sections');
  const section = sections?.of?.[0];
  const slots = section?.fields?.find((field) => field.name === 'slots');
  const slot = slots?.of?.[0];
  assert.ok(slot?.fields);
  slot.fields = slot.fields.filter((field) => field.name !== 'text');
  const textErrors = checkFullsiteContract({ sitePageSchema: pageSchema });
  assert.ok(textErrors.some((error) => error.includes('sections[].slots[].text')));

  const altSchema = cloneSchema(sitePage as unknown as SchemaNode);
  const altSlot = altSchema.fields?.find((field) => field.name === 'sections')?.of?.[0]
    ?.fields?.find((field) => field.name === 'slots')?.of?.[0];
  assert.ok(altSlot?.fields);
  altSlot.fields = altSlot.fields.filter((field) => field.name !== 'alt');
  const altErrors = checkFullsiteContract({ sitePageSchema: altSchema });
  assert.ok(altErrors.some((error) => error.includes('sections[].slots[].alt')));

  const settingsSchema = cloneSchema(siteSettings as unknown as SchemaNode);
  const footer = settingsSchema.fields?.find((field) => field.name === 'footer');
  const columns = footer?.fields?.find((field) => field.name === 'columns');
  const links = columns?.of?.[0].fields?.find((field) => field.name === 'links');
  const link = links?.of?.[0];
  assert.ok(link?.fields);
  link.fields = link.fields.filter((field) => field.name !== 'href');
  const hrefErrors = checkFullsiteContract({ siteSettingsSchema: settingsSchema });
  assert.ok(hrefErrors.some((error) => error.includes('footer.columns[].links[].href')));
});
