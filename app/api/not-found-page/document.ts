import { load } from 'cheerio';
import { serializeCatalogJson } from '../../../src/catalog/CatalogBootstrap';
import type { CatalogData } from '../../../src/catalog/types';
import type { Metadata } from 'next';
import { getLegacyPageShell, getLegacyScripts, renderLegacyPageHtml } from '../../../src/fullsite/templateRenderer';
import type { SitePageDocument, SiteSettingsDocument } from '../../../src/fullsite/types';
type SiteMetadata = Metadata;
export type NotFoundDocumentData = {
  page: SitePageDocument | null;
  settings: SiteSettingsDocument | null;
  catalogData: CatalogData | null;
  metadata: SiteMetadata;
};

type MetadataImage = string | URL | { url?: string | URL; alt?: string };
type MetadataShape = {
  metadataBase?: URL;
  title?: string;
  description?: string;
  alternates?: { canonical?: string | URL };
  openGraph?: { title?: string; description?: string; type?: string; url?: string | URL; images?: MetadataImage | MetadataImage[] };
  twitter?: { card?: string; title?: string; description?: string; images?: MetadataImage | MetadataImage[] };
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value instanceof URL) return value.toString();
  return undefined;
}

function absoluteHttpUrl(value: unknown, base: URL): string | undefined {
  const raw = stringValue(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function imageEntries(value: MetadataImage | MetadataImage[] | undefined): MetadataImage[] {
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}

function imageDetails(value: MetadataImage): { url?: string; alt?: string } {
  if (typeof value === 'string' || value instanceof URL) return { url: value.toString() };
  return { url: stringValue(value.url), alt: value.alt };
}

function metaTag(kind: 'name' | 'property', name: string, value: unknown): string {
  const content = stringValue(value);
  return content === undefined ? '' : '<meta ' + kind + '="' + escapeHtml(name) + '" content="' + escapeHtml(content) + '">';
}

function metadataMarkup(metadata: SiteMetadata): string {
  const values = metadata as MetadataShape;
  const base = values.metadataBase instanceof URL ? values.metadataBase : new URL('http://localhost:3000');
  const canonical = absoluteHttpUrl(values.alternates?.canonical, base);
  const ogUrl = absoluteHttpUrl(values.openGraph?.url, base);
  const title = values.title || 'Netpro Sourcing';
  const description = values.description || '';
  const ogTitle = values.openGraph?.title || title;
  const ogDescription = values.openGraph?.description || description;
  const ogImages = imageEntries(values.openGraph?.images).map(imageDetails).filter((image) => image.url);
  const twitterImages = imageEntries(values.twitter?.images).map(imageDetails).filter((image) => image.url);
  const tags = [
    '<title>' + escapeHtml(title) + '</title>',
    metaTag('name', 'description', description),
    canonical ? '<link rel="canonical" href="' + escapeHtml(canonical) + '">' : '',
    metaTag('name', 'robots', 'noindex, nofollow, noarchive'),
    metaTag('name', 'googlebot', 'noindex, nofollow, noarchive'),
    metaTag('property', 'og:title', ogTitle),
    metaTag('property', 'og:description', ogDescription),
    metaTag('property', 'og:type', values.openGraph?.type || 'website'),
    ogUrl ? metaTag('property', 'og:url', ogUrl) : '',
    ...ogImages.flatMap((image) => [
      metaTag('property', 'og:image', absoluteHttpUrl(image.url, base)),
      image.alt ? metaTag('property', 'og:image:alt', image.alt) : '',
    ]),
    metaTag('name', 'twitter:card', values.twitter?.card || 'summary_large_image'),
    metaTag('name', 'twitter:title', values.twitter?.title || ogTitle),
    metaTag('name', 'twitter:description', values.twitter?.description || ogDescription),
    ...twitterImages.flatMap((image) => [
      metaTag('name', 'twitter:image', absoluteHttpUrl(image.url, base)),
      image.alt ? metaTag('name', 'twitter:image:alt', image.alt) : '',
    ]),
  ];
  return tags.filter(Boolean).join('');
}

function renderCatalogBootstrap(data: CatalogData): string {
  const script = [
    'window.NETPRO_PRODUCTS=' + serializeCatalogJson(data.products) + ';',
    'window.NETPRO_CATEGORIES=' + serializeCatalogJson(data.categories) + ';',
    'window.NETPRO_CATALOG_STYLES=' + serializeCatalogJson({ categories: data.styles }) + ';',
    'window.NETPRO_CATALOG_REVISION=' + serializeCatalogJson(data.revision) + ';',
  ].join('');
  return '<script id="netpro-catalog-bootstrap">' + script + '</script>';
}

function renderLegacyScriptTags(pageKey: string, hasCatalogBootstrap: boolean): string {
  return getLegacyScripts(pageKey, { catalogBootstrap: hasCatalogBootstrap }).map((script) => {
    const attributes = [
      'src="' + escapeHtml(script.src) + '"',
      script.defer ? 'defer' : '',
      script.async ? 'async' : '',
      script.type ? 'type="' + escapeHtml(script.type) + '"' : '',
    ].filter(Boolean).join(' ');
    return '<script ' + attributes + '></script>';
  }).join('');
}

function rootRelativeReference(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return value;
  try {
    const url = new URL(trimmed, 'https://legacy-route.invalid/');
    return url.pathname + url.search + url.hash;
  } catch {
    return value;
  }
}

function rootRelativeCssUrls(styleText: string): string {
  return styleText.replace(/url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi, (match, quote: string | undefined, quoted: string | undefined, unquoted: string | undefined) => {
    const value = quoted ?? unquoted;
    if (value === undefined) return match;
    const rooted = rootRelativeReference(value);
    return 'url(' + (quote || '') + rooted + (quote || '') + ')';
  });
}

function rootRelativeDocumentReferences(html: string): string {
  const $ = load(html);
  $('[href], [src], [poster]').each((_, element) => {
    const target = $(element);
    for (const attribute of ['href', 'src', 'poster']) {
      const value = target.attr(attribute);
      if (value !== undefined) target.attr(attribute, rootRelativeReference(value));
    }
  });
  $('[style]').each((_, element) => {
    const target = $(element);
    const style = target.attr('style');
    if (style !== undefined) target.attr('style', rootRelativeCssUrls(style));
  });
  $('style').each((_, element) => {
    const target = $(element);
    const css = target.html();
    if (css) target.html(rootRelativeCssUrls(css));
  });
  return $.html() || html;
}
/** Build the complete controlled 404 HTML document for both GET and HEAD responses. */
export function renderNotFoundPageDocument(data: NotFoundDocumentData): string {
  const pageKey = '404';
  const shell = getLegacyPageShell(pageKey);
  const metadata = metadataMarkup(data.metadata);
  const bootstrap = data.catalogData ? renderCatalogBootstrap(data.catalogData) : '';
  const scripts = renderLegacyScriptTags(pageKey, Boolean(data.catalogData));
  const body = renderLegacyPageHtml(pageKey, data.page, data.settings, false);
  const head = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' + shell.headHtml + metadata;
  const html = '<!doctype html><html lang="' + escapeHtml(shell.htmlLang) + '"><head>' + head + '</head><body class="' + escapeHtml(shell.bodyClass) + '">' + bootstrap + body + scripts + '</body></html>';
  return rootRelativeDocumentReferences(html);
}

export function createNotFoundPageResponse(data: NotFoundDocumentData, includeBody = true): Response {
  return new Response(includeBody ? renderNotFoundPageDocument(data) : null, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}
