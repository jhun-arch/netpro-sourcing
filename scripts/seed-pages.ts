import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@sanity/client';
import { load } from 'cheerio';
import { LEGACY_TEMPLATES } from '../src/fullsite/legacyTemplates.generated';
import { PAGE_BINDINGS, type GeneratedPageBinding } from '../src/fullsite/pageBindings.generated';
import { SITE_PAGE_MANIFEST } from '../src/fullsite/pageManifest';
import { SITE_FOOTER_LINK_BINDINGS, SITE_HEADER_BINDINGS } from '../src/fullsite/siteSettingsBindings';

const projectId = '5mntophk';
const dataset = 'production';
const apiVersion = '2025-02-19';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export type SeedDocument = { _id: string; _type: string; [field: string]: unknown };

function visibleText($: ReturnType<typeof load>, element: any): string {
  const clone = $(element).clone();
  clone.find('svg,[aria-hidden="true"]').remove();
  return clone.text().replace(/\s+/g, ' ').trim();
}

function textValue(binding: GeneratedPageBinding): { text?: string; textLines?: string[] } {
  if (binding.kind !== 'text') return {};
  return {
    ...(binding.text !== undefined ? { text: binding.text } : {}),
    ...(binding.textLines ? { textLines: [...binding.textLines] } : {}),
  };
}

function sectionDisplayLabel(bindings: GeneratedPageBinding[], index: number): string {
  const heading = bindings.find((binding) => binding.kind === 'text' && binding.label.startsWith('标题 ·'));
  const image = bindings.find((binding) => binding.kind === 'image');
  const firstText = bindings.find((binding) => binding.kind === 'text' && (binding.text || binding.textLines?.length));
  const excerpt = (heading?.textLines?.join(' ') || heading?.text || heading?.label.split('·').slice(1).join('·') || image?.alt || image?.label.split('·').slice(1).join('·') || firstText?.text || firstText?.textLines?.join(' ') || bindings[0]?.label || '正文')
    .replace(/\s+/g, ' ').trim().slice(0, 48);
  const type = heading ? '标题模块' : image ? '图片模块' : '文字模块';
  return `${type} ${String(index).padStart(2, '0')} · ${excerpt || '页面内容'}`;
}

export function buildSitePageDocuments(
  templates: Record<string, string> = LEGACY_TEMPLATES,
  bindingMap: Record<string, GeneratedPageBinding[]> = PAGE_BINDINGS,
): SeedDocument[] {
  return SITE_PAGE_MANIFEST.map((entry) => {
    const template = templates[entry.pageKey];
    const bindings = bindingMap[entry.pageKey];
    if (!template || !bindings?.length) throw new Error(`Seed stopped: the fixed page source is missing for ${entry.pageKey}.`);
    const $ = load(template);
    const sectionMap = new Map<string, { _key: string; _type: 'sitePageSection'; sectionId: string; label: string; slots: Record<string, unknown>[] }>();
    const sectionNumbers = new Map<string, number>();

    for (const binding of bindings) {
      let section = sectionMap.get(binding.sectionId);
      if (!section) {
        const sectionNumber = sectionNumbers.size + 1;
        sectionNumbers.set(binding.sectionId, sectionNumber);
        const sectionBindings = bindings.filter((candidate) => candidate.sectionId === binding.sectionId);
        section = {
          _key: binding.sectionId,
          _type: 'sitePageSection',
          sectionId: binding.sectionId,
          label: sectionDisplayLabel(sectionBindings, sectionNumber),
          slots: [],
        };
        sectionMap.set(binding.sectionId, section);
      }
      const slot: Record<string, unknown> = {
        _key: binding.slotId,
        _type: 'sitePageSlot',
        slotId: binding.slotId,
        label: binding.label,
        kind: binding.kind,
        selector: binding.selector,
        ...(binding.textMode ? { textMode: binding.textMode } : {}),
        ...(binding.textNodePath ? { textNodePath: binding.textNodePath } : {}),
        ...textValue(binding),
        ...(binding.sourcePath ? { sourcePath: binding.sourcePath } : {}),
        ...(binding.alt !== undefined ? { alt: binding.alt } : {}),
        ...(binding.href ? { href: binding.href } : {}),
        ...(binding.editableLinkLabel !== undefined ? { editableLinkLabel: binding.editableLinkLabel } : {}),
        ...(binding.editableLinkLabel !== false && binding.linkLabel ? { linkLabel: binding.linkLabel } : {}),
      };
      if (binding.kind === 'text' && !binding.attribute && binding.textNodePath) {
        const target = $(binding.selector).get(0);
        let node: any = target;
        for (const index of binding.textNodePath.split('.').map(Number)) node = node?.children?.[index];
        if (node?.type !== 'text') throw new Error(`Seed stopped: text binding ${binding.slotId} no longer resolves in ${entry.pageKey}.`);
      }
      section.slots.push(slot);
    }

    const title = $('head title').first().text().trim();
    const description = $('head meta[name="description"]').attr('content') || '';
    const ogTitle = $('head meta[property="og:title"]').attr('content') || title;
    const ogDescription = $('head meta[property="og:description"]').attr('content') || description;
    return {
      _id: entry.docId,
      _type: 'sitePage',
      pageKey: entry.pageKey,
      route: entry.route,
      label: entry.label,
      sections: [...sectionMap.values()],
      seo: {
        title,
        description,
        ogTitle,
        ogDescription,
      },
    };
  });
}

function requireElement($: ReturnType<typeof load>, selector: string, context: string): any {
  const element = $(selector).first();
  if (!element.length) throw new Error(`Seed stopped: the legacy source is missing ${context}.`);
  return element.get(0);
}

function sourceAddressLines($: ReturnType<typeof load>): string[] {
  const address = requireElement($, 'footer .home-footer-contact address', 'footer address');
  const lines: string[] = [];
  let current = '';
  const flush = () => {
    const line = current.replace(/\s+/g, ' ').trim();
    if (line) lines.push(line);
    current = '';
  };
  for (const child of address.children ?? []) {
    if (child.type === 'tag' && child.tagName === 'br') { flush(); continue; }
    if (child.type === 'text') current += String(child.data ?? '');
  }
  flush();
  return lines;
}

function buildNavigationSlots($: ReturnType<typeof load>): Record<string, unknown>[] {
  return SITE_HEADER_BINDINGS.map((binding) => {
    const slot: Record<string, unknown> = {
      _key: binding.bindingId,
      _type: 'siteSettingSlot',
      bindingId: binding.bindingId,
      label: binding.label,
      kind: binding.kind,
    };
    if ('sourceHref' in binding) {
      const anchor = $('header a').filter((_, element) => $(element).attr('href') === binding.sourceHref).first();
      slot.href = binding.sourceHref;
      slot.linkLabel = anchor.length ? visibleText($, anchor.get(0)) : binding.label.split('·').at(-1)?.trim() || binding.label;
    } else if ('tab' in binding) {
      const button = $(`header button[data-customization-tab="${binding.tab}"]`).first();
      slot.text = button.length ? visibleText($, button.get(0)) : binding.label.split('·').at(-1)?.trim() || binding.label;
    } else {
      const button = $('header button.nav-trigger').filter((_, element) => $(element).attr('aria-controls') === 'nav-panel-1').first();
      slot.text = button.length ? visibleText($, button.get(0)) : '定制入口';
    }
    return slot;
  });
}

function buildFooterColumns($: ReturnType<typeof load>): Record<string, unknown>[] {
  const configs = [
    ['products', 'footer .footer-products'],
    ['patches', 'footer .footer-custom-patches'],
    ['company', 'footer .footer-company'],
    ['support', 'footer .footer-support'],
  ] as const;
  return configs.map(([slug, selector]) => {
    const column = requireElement($, selector, `${slug} footer column`);
    const links = $(column).find('a[href]').toArray();
    const usedSlugs = new Set<string>();
    const seededLinks = links.map((element) => {
      const href = $(element).attr('href') || '';
      const binding = SITE_FOOTER_LINK_BINDINGS.find((candidate) =>
        candidate.slug.startsWith(`${slug}-`) && candidate.sourceHref === href && !usedSlugs.has(candidate.slug),
      );
      if (!binding) throw new Error(`Seed stopped: ${slug} footer link ${href} has no stable CMS binding.`);
      usedSlugs.add(binding.slug);
      return {
        _key: binding.slug,
        _type: 'siteFooterLink',
        slug: binding.slug,
        label: visibleText($, element),
        href,
      };
    });
    return {
      _key: `${slug}-column`,
      _type: 'siteFooterColumn',
      slug,
      title: visibleText($, $(column).find('h2').first().get(0)),
      links: seededLinks,
    };
  });
}

export function buildSiteSettingsDocument(template = LEGACY_TEMPLATES.about): SeedDocument {
  if (!template) throw new Error('Seed stopped: About template is missing for shared site settings.');
  const $ = load(template);
  const email = requireElement($, 'footer .contact-email', 'footer contact email');
  const contactEmail = ($(email).attr('href') || '').replace(/^mailto:/i, '').split('?')[0];
  const manager = visibleText($, requireElement($, 'footer .contact-person', 'footer contact manager'));
  const managerSeparator = manager.indexOf(':');
  const managerLabel = managerSeparator >= 0 ? manager.slice(0, managerSeparator).trim() : '';
  const managerName = managerSeparator >= 0 ? manager.slice(managerSeparator + 1).trim() : manager;
  const socialLinks = $('footer [data-social][href]').toArray().map((element) => {
    const slug = $(element).attr('data-social') || '';
    return {
      _key: slug,
      _type: 'siteFooterSocial',
      slug,
      label: $(element).attr('aria-label') || slug,
      href: $(element).attr('href') || '',
      iconKey: slug,
    };
  });
  const legal = $('footer .home-footer-legal a[href]').first();
  const legalLink = legal.length ? { label: visibleText($, legal.get(0)), href: legal.attr('href') || '' } : undefined;
  const footer = {
    description: visibleText($, requireElement($, 'footer .home-footer-brand > p', 'footer description')),
    newsletterTitle: visibleText($, requireElement($, '#home-footer-collective-title', 'footer newsletter title')),
    newsletterDescription: visibleText($, requireElement($, '.home-footer-subscribe > p', 'footer newsletter description')),
    emailPlaceholder: $('footer .footer-signup input').attr('placeholder') || '',
    subscribeLabel: visibleText($, requireElement($, '.footer-signup-button', 'footer subscribe button')),
    contactEmail,
    addressLines: sourceAddressLines($),
    managerLabel,
    managerName,
    socialLinks,
    columns: buildFooterColumns($),
    copyright: visibleText($, requireElement($, 'footer .home-footer-bottom > span:first-child', 'footer copyright')),
    ...(legalLink ? { legalLink } : {}),
    tagline: visibleText($, requireElement($, 'footer .home-footer-legal > span', 'footer tagline')),
  };
  return {
    _id: 'siteSettings',
    _type: 'siteSettings',
    navigation: { slots: buildNavigationSlots($) },
    footer,
  };
}

export function buildFullsiteSeedDocuments(): SeedDocument[] {
  return [...buildSitePageDocuments(), buildSiteSettingsDocument()];
}

function parseFlags(args: string[]): 'dry-run' | 'apply' {
  const flags = new Set(args);
  for (const flag of flags) if (!['--dry-run', '--apply'].includes(flag)) throw new Error(`Unknown seed option: ${flag}`);
  if (flags.has('--dry-run') && flags.has('--apply')) throw new Error('Choose either --dry-run or --apply.');
  return flags.has('--apply') ? 'apply' : 'dry-run';
}

function assertSeedTargetEnvironment(): void {
  if (process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== projectId || process.env.NEXT_PUBLIC_SANITY_DATASET !== dataset) {
    throw new Error('Seed stopped: the environment must target the isolated experiment project and dataset.');
  }
}

function assertExistingDocumentTypes(documents: SeedDocument[], expected: SeedDocument[]): void {
  const types = new Map(expected.map((document) => [document._id, document._type]));
  for (const document of documents) {
    const id = document._id.replace(/^drafts\./, '');
    const expectedType = types.get(id);
    if (expectedType && expectedType !== document._type) {
      throw new Error(`Seed stopped: ${id} already exists with an unexpected document type.`);
    }
    if (id === 'homePage' && document._type !== 'homePage') {
      throw new Error('Seed stopped: the protected homepage identity has an unexpected document type.');
    }
  }
}

async function writeBackup(documents: SeedDocument[]): Promise<string> {
  const output = path.join(root, 'output');
  await mkdir(output, { recursive: true });
  const capturedAt = new Date().toISOString();
  const backupPath = path.join(output, `site-pages-seed-backup-${capturedAt.replace(/[:.]/g, '-')}-${randomUUID()}.json`);
  await writeFile(backupPath, JSON.stringify({
    target: { projectId, dataset },
    capturedAt,
    note: 'Read-only Sanity snapshot created immediately before createIfNotExists; existing sitePage, siteSettings, and homePage documents are never replaced.',
    documents,
  }, null, 2), { encoding: 'utf8', flag: 'wx' });
  return backupPath;
}

export async function runFullsiteSeed(mode: 'dry-run' | 'apply' = 'dry-run'): Promise<void> {
  const documents = buildFullsiteSeedDocuments();
  if (mode === 'dry-run') {
    console.log(`Dry run only: ${SITE_PAGE_MANIFEST.length} page documents plus siteSettings are ready for ${projectId}/${dataset}. No Sanity connection, backup, or writes were made. Pass --apply only after confirming the isolated experiment target.`);
    return;
  }
  assertSeedTargetEnvironment();
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) throw new Error('Seed stopped: the server-side Sanity write token is not configured.');
  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false });
  const rawClient = client.withConfig({ perspective: 'raw' });
  const trackedIds = [
    ...documents.map((document) => document._id),
    ...documents.map((document) => `drafts.${document._id}`),
    'homePage', 'drafts.homePage',
  ];
  const existing = await rawClient.fetch<SeedDocument[]>('*[_id in $ids]', { ids: trackedIds });
  assertExistingDocumentTypes(existing, documents);
  const backupPath = await writeBackup(existing);
  const present = new Set(existing.map((document) => document._id));
  const missing = documents.filter((document) => !present.has(document._id) && !present.has(`drafts.${document._id}`));
  const transaction = client.transaction();
  for (const document of missing) transaction.createIfNotExists(document as Parameters<typeof transaction.createIfNotExists>[0]);
  if (missing.length) await transaction.commit();
  console.log(`Seed complete: ${missing.length} missing documents created with createIfNotExists; existing documents and homePage were untouched. Pre-write backup: ${path.relative(root, backupPath)}.`);
}

async function main(): Promise<void> {
  await runFullsiteSeed(parseFlags(process.argv.slice(2)));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('Site-page seed stopped. Review the isolated target and local page bindings; credentials are never printed.');
    process.exitCode = 1;
  });
}
