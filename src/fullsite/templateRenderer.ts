import 'server-only';

import { getImageDimensions } from '@sanity/asset-utils';
import { createDataAttribute } from 'next-sanity';
import { load } from 'cheerio';
import type { AnyNode, Element as DomElement } from 'domhandler';
import { createElement, Fragment, type CSSProperties, type ReactNode } from 'react';
import { hotspotPosition, imageUrl } from '../cms/images';
import { SANITY_DATASET, SANITY_PROJECT_ID } from '../cms/client';
import { SANITY_STUDIO_BASE_PATH } from '../sanity/urls';
import type { SanityImage } from '../cms/types';
import type { SitePageDocument, SitePageSlot, SiteSettingsDocument } from './types';
import { applySiteHeaderAndFooter } from './shared';
import { LEGACY_TEMPLATES } from './legacyTemplates.generated';
import { PAGE_BINDINGS, type GeneratedPageBinding } from './pageBindings.generated';

const REACT_ATTRIBUTES: Record<string, string> = {
  acceptcharset: 'acceptCharset', accesskey: 'accessKey', autofocus: 'autoFocus', autocomplete: 'autoComplete',
  cellpadding: 'cellPadding', cellspacing: 'cellSpacing', class: 'className', colspan: 'colSpan',
  contenteditable: 'contentEditable', crossorigin: 'crossOrigin', fetchpriority: 'fetchPriority', for: 'htmlFor',
  formnovalidate: 'formNoValidate', 'http-equiv': 'httpEquiv', inputmode: 'inputMode', maxlength: 'maxLength',
  minlength: 'minLength', novalidate: 'noValidate', readonly: 'readOnly', rowspan: 'rowSpan', srcset: 'srcSet',
  tabindex: 'tabIndex', usemap: 'useMap', viewbox: 'viewBox', preserveaspectratio: 'preserveAspectRatio',
  'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule', 'clip-rule': 'clipRule', 'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace',
};

const BOOLEAN_ATTRIBUTES = new Set([
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls', 'default', 'defer', 'disabled',
  'formnovalidate', 'hidden', 'inert', 'ismap', 'itemscope', 'loop', 'multiple', 'muted', 'nomodule',
  'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected',
]);

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

export type LegacyScript = { src: string; defer: boolean; async: boolean; type?: string };
export type LegacyPageShell = {
  pageKey: string;
  htmlLang: string;
  bodyClass: string;
  headHtml: string;
  bodyHtml: string;
  scripts: LegacyScript[];
  metadata: { title: string; description: string; ogTitle: string; ogDescription: string; ogImage?: string; canonicalPath?: string };
};

export class SitePageRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SitePageRenderError';
  }
}

function legacySource(pageKey: string): string {
  const source = LEGACY_TEMPLATES[pageKey];
  if (!source) throw new SitePageRenderError(`缺少固定页面模板：${pageKey}`);
  return source;
}

export function getLegacyPageShell(pageKey: string): LegacyPageShell {
  const $ = load(legacySource(pageKey));
  const title = $('head title').first().text().trim();
  const description = $('head meta[name="description"]').attr('content') || '';
  const ogTitle = $('head meta[property="og:title"]').attr('content') || title;
  const ogDescription = $('head meta[property="og:description"]').attr('content') || description;
  const ogImage = $('head meta[property="og:image"]').attr('content');
  const canonicalHref = $('head link[rel]').filter((_, element) =>
    ($(element).attr('rel') || '').toLowerCase().split(/\s+/).includes('canonical'),
  ).first().attr('href');
  let canonicalPath: string | undefined;
  if (canonicalHref) {
    try { canonicalPath = new URL(canonicalHref, 'https://netprosourcing.vercel.app').pathname; }
    catch { canonicalPath = undefined; }
  }
  const head = $('head').clone();
  head.children('title,meta[charset],meta[name="viewport"],meta[name="description"],meta[property^="og:"]').remove();
  head.find('link[rel]').filter((_, element) =>
    ($(element).attr('rel') || '').toLowerCase().split(/\s+/).includes('canonical'),
  ).remove();
  head.find('meta[name],meta[property]').filter((_, element) => {
    const node = $(element);
    const name = node.attr('name')?.toLowerCase() || '';
    const property = node.attr('property')?.toLowerCase() || '';
    return /^(?:robots|googlebot|twitter(?:-.*)?)$/.test(name) || name.startsWith('twitter:') || property.startsWith('twitter:');
  }).remove();
  head.find('script').remove();
  const scripts = $('script[src]').toArray().map((element) => ({
    src: $(element).attr('src') || '',
    defer: $(element).attr('defer') !== undefined,
    async: $(element).attr('async') !== undefined,
    type: $(element).attr('type'),
  })).filter((script) => script.src);
  if ($('script:not([src])').length) throw new SitePageRenderError(`页面 ${pageKey} 含未登记的内联脚本，拒绝在模板中执行。`);
  return {
    pageKey,
    htmlLang: $('html').attr('lang') || 'en',
    bodyClass: $('body').attr('class') || '',
    headHtml: head.html() || '',
    bodyHtml: $('body').html() || '',
    scripts,
    metadata: { title, description, ogTitle, ogDescription, ...(ogImage ? { ogImage } : {}), ...(canonicalPath ? { canonicalPath } : {}) },
  };
}

export function getLegacyScripts(pageKey: string, options: { catalogBootstrap?: boolean } = {}): LegacyScript[] {
  const shell = getLegacyPageShell(pageKey);
  return shell.scripts.filter((script) => {
    const pathname = script.src.split('?')[0].split('/').at(-1)?.toLowerCase();
    return !(options.catalogBootstrap && (pathname === 'products.js' || pathname === 'purchase-products.js'));
  });
}

export function requiresCatalogBootstrap(pageKey: string): boolean {
  return getLegacyPageShell(pageKey).scripts.some((script) => {
    const filename = new URL(script.src, 'https://legacy.invalid').pathname.split('/').at(-1)?.toLowerCase();
    return filename === 'products.js' || filename === 'purchase-products.js' || filename === 'app.js' || filename === 'quote.js';
  });
}

export function getSitePageBindings(pageKey: string): GeneratedPageBinding[] {
  return PAGE_BINDINGS[pageKey] ?? [];
}

function slotPath(section: SitePageDocument['sections'][number], slot: SitePageSlot, field: string): Array<string | number | { _key: string }> {
  return ['sections', { _key: section._key }, 'slots', { _key: slot._key }, field];
}

function setDataAttribute(target: any, path: Array<string | number | { _key: string }>, preview: boolean, pageId: string): void {
  if (!preview || !pageId || pageId === 'sitePage') return;
  target.attr('data-sanity', createDataAttribute({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    id: pageId.replace(/^drafts\./, ''),
    type: 'sitePage',
    baseUrl: SANITY_STUDIO_BASE_PATH,
    path: path as never,
  }).toString());
}

function safeHref(value: string): string {
  const href = value.trim();
  if (!href || /[\u0000-\u001f\u007f\\]/.test(href) || href.startsWith('//')) throw new SitePageRenderError('页面链接格式不安全。');
  if (/^https:\/\//i.test(href)) {
    try { const url = new URL(href); if (url.hostname) return url.toString(); } catch { /* stable error below */ }
    throw new SitePageRenderError('页面外部链接必须使用 HTTPS。');
  }
  if (/^mailto:/i.test(href) && /^mailto:[^\s<>@]+@[^\s<>@]+(?:\?[^\s<>]*)?$/i.test(href)) return href;
  if (/^tel:/i.test(href) && /^tel:[+0-9(). -]+$/i.test(href)) return href;
  if (/^(?:\/|#|\.{1,2}\/)?[a-z0-9][a-z0-9._~/%?&=+#-]*$/i.test(href)) return href;
  throw new SitePageRenderError('页面链接必须是站内路径、电话、邮箱或 HTTPS 地址。');
}

function parseStyle(value: string | undefined): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const entry of value?.split(';') ?? []) {
    const separator = entry.indexOf(':');
    if (separator < 1) continue;
    const key = entry.slice(0, separator).trim().toLowerCase();
    const content = entry.slice(separator + 1).trim();
    if (key && content) declarations[key] = content;
  }
  return declarations;
}

function writeStyle(target: any, values: Record<string, string>): void {
  target.attr('style', Object.entries(values).map(([key, value]) => `${key}: ${value}`).join('; '));
}

function uniqueSitePageSlots(page: SitePageDocument): Map<string, { section: SitePageDocument['sections'][number]; slot: SitePageSlot }> {
  const result = new Map<string, { section: SitePageDocument['sections'][number]; slot: SitePageSlot }>();
  for (const section of page.sections ?? []) {
    for (const slot of section.slots ?? []) {
      if (!slot.slotId || result.has(slot.slotId)) throw new SitePageRenderError(`页面 ${page.pageKey} 的内容标识缺失或重复。`);
      result.set(slot.slotId, { section, slot });
    }
  }
  return result;
}

export function assertSitePageBindings(pageKey: string, page: SitePageDocument): void {
  const bindings = getSitePageBindings(pageKey);
  const slots = uniqueSitePageSlots(page);
  const expectedSections = new Set(bindings.map((binding) => binding.sectionId));
  const actualSections = new Set(page.sections.map((section) => section.sectionId));
  if (expectedSections.size !== actualSections.size || [...expectedSections].some((id) => !actualSections.has(id))) {
    throw new SitePageRenderError(`页面 ${pageKey} 的模块结构与固定模板绑定不一致。`);
  }
  const expectedSlots = new Set(bindings.map((binding) => binding.slotId));
  if (expectedSlots.size !== slots.size || [...expectedSlots].some((id) => !slots.has(id))) {
    throw new SitePageRenderError(`页面 ${pageKey} 的编辑项与固定模板绑定不一致。`);
  }
  for (const binding of bindings) {
    if (slots.get(binding.slotId)?.section.sectionId !== binding.sectionId) {
      throw new SitePageRenderError(`页面 ${pageKey} 的编辑项所属模块不正确。`);
    }
  }
}

function textNodeAt(target: any, nodePath: string): any {
  let node = target.get(0);
  for (const index of nodePath.split('.').map(Number)) node = node?.children?.[index];
  if (node?.type !== 'text') throw new SitePageRenderError('页面文字绑定无法匹配当前模板节点。');
  return node;
}

function textNodeBindingTarget($: ReturnType<typeof load>, textNode: any, fallback: any): any {
  const parent = textNode?.parent;
  return parent?.type === 'tag' ? $(parent) : fallback;
}

function textGroups(element: any): any[][] {
  const directSpans = (element.children ?? []).filter((node: any) => node.type === 'tag' && node.tagName === 'span' && node.attribs?.['aria-hidden'] !== 'true');
  const collect = (node: any): any[] => {
    if (node.type === 'tag' && (node.tagName === 'svg' || node.tagName === 'br' || node.attribs?.['aria-hidden'] === 'true')) return [];
    if (node.type === 'text') return String(node.data ?? '').trim() ? [node] : [];
    return (node.children ?? []).flatMap(collect);
  };
  if (directSpans.length > 1 && !(element.children ?? []).some((node: any) => node.type === 'tag' && node.tagName === 'br')) {
    return directSpans.map(collect).filter((group: any[]) => group.length);
  }
  const groups: any[][] = [[]];
  const visit = (node: any) => {
    if (node.type === 'tag' && node.attribs?.['aria-hidden'] === 'true' || node.type === 'tag' && node.tagName === 'svg') return;
    if (node.type === 'tag' && node.tagName === 'br') { groups.push([]); return; }
    if (node.type === 'text') { if (String(node.data ?? '').trim()) groups.at(-1)!.push(node); return; }
    for (const child of node.children ?? []) visit(child);
  };
  visit(element);
  return groups.filter((group) => group.length);
}

function setLineText(target: any, lines: string[]): void {
  const groups = textGroups(target.get(0));
  if (groups.length !== lines.length) throw new SitePageRenderError('分行标题行数与原模板不一致。');
  lines.forEach((line, index) => {
    groups[index][0].data = line;
    for (const extra of groups[index].slice(1)) extra.data = '';
  });
}

function requireImageDimensions(image: SanityImage): { width: number; height: number } {
  const dimensions = image.asset?.metadata?.dimensions;
  if (dimensions && dimensions.width >= 1 && dimensions.height >= 1) return { width: Math.round(dimensions.width), height: Math.round(dimensions.height) };
  const ref = image.asset?._ref;
  const id = image.asset?._id;
  if (!ref && !id) throw new SitePageRenderError('页面图片缺少 Sanity 素材引用。');
  try {
    const size = getImageDimensions(ref ? { _ref: ref, _type: 'reference' } : id!);
    return { width: Math.round(size.width), height: Math.round(size.height) };
  } catch { throw new SitePageRenderError('页面图片素材尺寸无效。'); }
}

function imageUrlForSlot(slot: SitePageSlot, binding: GeneratedPageBinding): { url: string; replaced: boolean; position: string; alt: string } {
  const image = slot.image;
  const alt = slot.alt?.trim() || binding.alt || '';
  if (image?.asset?._ref || image?.asset?._id) {
    const dimensions = requireImageDimensions(image);
    const maxDimension = binding.target === 'background' || binding.target === 'inline-background' ? 1800 : 1600;
    const scale = Math.min(1, maxDimension / Math.max(dimensions.width, dimensions.height));
    const size = { width: Math.max(1, Math.round(dimensions.width * scale)), height: Math.max(1, Math.round(dimensions.height * scale)) };
    return { url: imageUrl(image, size), replaced: true, position: hotspotPosition(image), alt };
  }
  return { url: binding.sourcePath || slot.sourcePath || '', replaced: false, position: '50% 50%', alt };
}

function visibleTextNodes(node: any): any[] {
  if (!node) return [];
  if (node.type === 'text') return String(node.data ?? '').trim() ? [node] : [];
  if (node.type !== 'tag' || node.tagName === 'svg' || node.tagName === 'script' || node.tagName === 'style' || node.attribs?.['aria-hidden'] === 'true') return [];
  return (node.children ?? []).flatMap(visibleTextNodes);
}

function normalizedVisibleText(target: any): string {
  const node = target.get(0);
  return visibleTextNodes(node).map((text: any) => String(text.data ?? '')).join('').replace(/\s+/g, ' ').trim();
}

function setVisibleLabel(target: any, value: string): void {
  const node = target.get(0);
  if (!node || normalizedVisibleText(target) === value.replace(/\s+/g, ' ').trim()) return;
  const textNodes = visibleTextNodes(node);
  if (textNodes.length) {
    textNodes[0].data = value;
    for (const extra of textNodes.slice(1)) extra.data = '';
  } else target.prepend(value);
}

function replaceImage($: ReturnType<typeof load>, target: any, slot: SitePageSlot, binding: GeneratedPageBinding): void {
  const image = imageUrlForSlot(slot, binding);
  if (!image.url) return;
  if (!image.replaced) return;
  if (binding.target === 'background') {
    const style = parseStyle(target.attr('style'));
    const aboutHero = binding.selector === '.ip-about-hero';
    const variable = aboutHero ? '--cms-about-hero-image' : '--cms-contact-studio-image';
    style[variable] = `url("${image.url.replace(/["\\]/g, '')}")`;
    if (image.replaced) style[`${variable}-position`] = image.position;
    writeStyle(target, style);
    const css = aboutHero
      ? `.about-editorial-page .ip-about-hero{background-image:linear-gradient(90deg,rgba(12,24,41,.82) 0%,rgba(12,24,41,.55) 46%,rgba(12,24,41,.12) 100%),var(--cms-about-hero-image)!important${image.replaced ? ';background-position:0 0,var(--cms-about-hero-image-position)!important' : ''}}`
      : `.contact-page .contact-layout:before{background-image:var(--cms-contact-studio-image)!important${image.replaced ? ';background-position:var(--cms-contact-studio-image-position)!important' : ''}}`;
    $('style[data-site-page-image-overrides]').remove();
    $('<style data-site-page-image-overrides></style>').text(css).appendTo($.root());
    return;
  }
  if (binding.target === 'gallery') {
    target.attr('data-image', image.url);
    target.attr('data-image-size', image.replaced ? 'cover' : target.attr('data-image-size') || 'cover');
    target.attr('data-position', image.replaced ? image.position : target.attr('data-position') || '50% 50%');
    if (target.attr('data-lightbox-size') !== undefined) target.attr('data-lightbox-size', image.replaced ? 'cover' : target.attr('data-lightbox-size'));
    target.attr('data-alt', image.alt);
    const oldLabel = target.attr('aria-label') || '';
    const oldAlt = binding.alt || '';
      if (oldAlt && oldLabel.includes(oldAlt)) target.attr('aria-label', oldLabel.replace(oldAlt, image.alt));
      else if (oldLabel) {
        const prefix = oldLabel.match(/^(?:Show\s+|[^:]+:\s*)/)?.[0] || '';
        target.attr('aria-label', `${prefix}${image.alt}`.trim());
      } else target.attr('aria-label', image.alt);
    const art = target.find('.custom-product-thumb-art').first();
    if (art.length) {
      const style = parseStyle(art.attr('style'));
      style['background-image'] = `url("${image.url}")`;
      if (image.replaced) {
        style['background-size'] = 'cover';
        style['background-position'] = image.position;
      }
      writeStyle(art, style);
    }
    return;
  }
  if (binding.target === 'option') {
    target.attr('data-option-image', image.url).attr('data-option-alt', image.alt);
    if (image.replaced) {
      target.attr('data-option-size', 'cover').attr('data-option-position', image.position);
      const stage = target.closest('[data-headwear-options]').find('.custom-option-image[data-option-image]').first();
      if (stage.length) {
        const style = parseStyle(stage.attr('style'));
        style['background-image'] = `url("${image.url}")`;
        style['background-size'] = 'cover';
        style['background-position'] = image.position;
        writeStyle(stage, style);
        stage.attr('aria-label', image.alt);
      }
    }
    return;
  }
  if (target.is('img')) {
    target.attr('src', image.url).attr('alt', image.alt);
    if (image.replaced) {
      const size = requireImageDimensions(slot.image!);
      target.attr('width', String(size.width)).attr('height', String(size.height));
      const style = parseStyle(target.attr('style'));
      style['object-fit'] = 'cover';
      style['object-position'] = image.position;
      writeStyle(target, style);
    }
    return;
  }
  const style = parseStyle(target.attr('style'));
  style['background-image'] = `url("${image.url}")`;
  if (image.replaced) {
    style['background-size'] = 'cover';
    style['background-position'] = image.position;
  }
  writeStyle(target, style);
  if (target.attr('role') === 'img' || target.attr('aria-label')) target.attr('aria-label', image.alt);
  void $;
}

function applyPageContent($: ReturnType<typeof load>, pageKey: string, page: SitePageDocument, preview: boolean): void {
  assertSitePageBindings(pageKey, page);
  const slots = uniqueSitePageSlots(page);
  const textPreviewTargets = new WeakSet<object>();
  for (const binding of getSitePageBindings(pageKey)) {
    const found = $(binding.selector);
    if (found.length !== 1) throw new SitePageRenderError(`模板绑定 ${binding.slotId} 无法唯一匹配 DOM。`);
    const target = found.first();
    const { section, slot } = slots.get(binding.slotId)!;
    if (binding.kind === 'text') {
      let previewTarget = target;
      if (binding.attribute) {
        if (slot.text !== undefined) target.attr(binding.attribute, slot.text);
      } else if (binding.textNodePath) {
        const textNode = textNodeAt(target, binding.textNodePath);
        previewTarget = textNodeBindingTarget($, textNode, target);
        if (slot.text !== undefined) textNode.data = slot.text;
      } else if (binding.textMode === 'lines') {
        if (slot.textLines) setLineText(target, slot.textLines);
      }
      const previewTargetNode = previewTarget.get(0);
      if ((slot.text !== undefined || slot.textLines?.length) && previewTargetNode && !textPreviewTargets.has(previewTargetNode)) {
        setDataAttribute(previewTarget, slotPath(section, slot, binding.textMode === 'lines' ? 'textLines' : 'text'), preview, page._id);
        textPreviewTargets.add(previewTargetNode);
      }
    } else if (binding.kind === 'image') {
      replaceImage($, target, slot, binding);
      setDataAttribute(target, slotPath(section, slot, 'image'), preview, page._id);
    } else {
      if (slot.href) target.attr('href', safeHref(slot.href));
      const canEditLabel = binding.editableLinkLabel !== false;
      if (canEditLabel && slot.linkLabel) setVisibleLabel(target, slot.linkLabel);
      setDataAttribute(target, slotPath(section, slot, canEditLabel && slot.linkLabel ? 'linkLabel' : 'href'), preview, page._id);
    }
  }
}

function cssStyle(style: string | undefined): CSSProperties {
  const output: Record<string, string> = {};
  for (const item of style?.split(';') ?? []) {
    const separator = item.indexOf(':');
    if (separator < 1) continue;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (!key || !value) continue;
    if (key.startsWith('--')) output[key] = value;
    else output[key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())] = value;
  }
  return output as CSSProperties;
}

function reactAttributes(node: DomElement): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  const raw = node.attribs ?? {};
  for (const [name, original] of Object.entries(raw)) {
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith('on')) continue;
    if (lowerName === 'style') { attributes.style = cssStyle(original); continue; }
    if (lowerName === 'value' && node.tagName === 'input') { attributes.defaultValue = original; continue; }
    if (lowerName === 'checked' && node.tagName === 'input') { attributes.defaultChecked = true; continue; }
    if (lowerName === 'selected' && node.tagName === 'option') continue;
    if (BOOLEAN_ATTRIBUTES.has(lowerName)) { if (original !== undefined) attributes[REACT_ATTRIBUTES[lowerName] ?? lowerName] = true; continue; }
    if (lowerName === 'tabindex') { attributes.tabIndex = Number(original); continue; }
    attributes[REACT_ATTRIBUTES[lowerName] ?? name] = original;
  }
  return attributes;
}

function childrenToReact(children: AnyNode[]): ReactNode[] {
  return children.map((node, index) => nodeToReact(node, index)).filter((node): node is ReactNode => node !== null);
}

function selectedOption(children: AnyNode[]): DomElement | undefined {
  for (const child of children) {
    if (child.type !== 'tag') continue;
    const element = child as DomElement;
    if (element.tagName === 'option' && element.attribs?.selected !== undefined) return element;
    const nested = selectedOption(element.children ?? []);
    if (nested) return nested;
  }
  return undefined;
}

function nodeToReact(node: AnyNode, key: number): ReactNode {
  if (node.type === 'text') return node.data;
  if (node.type === 'comment' || node.type === 'directive' || node.type === 'script') return null;
  if (node.type !== 'tag' && node.type !== 'style') return null;
  const element = node as DomElement;
  const props: Record<string, unknown> = { ...reactAttributes(element), key };
  if (element.tagName === 'noscript') {
    props.dangerouslySetInnerHTML = { __html: (element.children ?? []).map((child: any) => child.type === 'text' ? child.data : '').join('') };
    return createElement('noscript', props);
  }
  if (element.tagName === 'textarea') {
    const currentValue = element.children?.map((child: any) => child.type === 'text' ? child.data : '').join('') ?? '';
    props.defaultValue = currentValue;
    return createElement('textarea', props);
  }
  if (element.tagName === 'select') {
    const selected = selectedOption(element.children ?? []);
    if (selected) props.defaultValue = selected.attribs?.value ?? selected.children?.map((child: any) => child.data ?? '').join('');
  }
  const children = childrenToReact(element.children ?? []);
  if (VOID_ELEMENTS.has(element.tagName)) return createElement(element.tagName, props);
  return createElement(element.tagName, props, ...children);
}

/** Transform the controlled template into a safe public HTML fragment. CMS values enter only through text, validated hrefs, image URLs, and allowlisted style properties. */
export function renderLegacyPageHtml(
  pageKey: string,
  page: SitePageDocument | null,
  settings: SiteSettingsDocument | null,
  preview = false,
): string {
  const shell = getLegacyPageShell(pageKey);
  const bodyHtml = applySiteHeaderAndFooter(shell.bodyHtml, settings, preview);
  const $ = load(bodyHtml, {}, false);
  if (page) applyPageContent($, pageKey, page, preview);
  $('script').remove();
  $.root().find('*').each((_, element) => {
    const target = $(element);
    for (const name of Object.keys((element as DomElement).attribs ?? {})) {
      if (name.toLowerCase().startsWith('on')) target.removeAttr(name);
    }
    if (!preview) target.removeAttr('data-sanity');
  });
  return $.root().html() || '';
}

/** Render the same transformed HTML fragment as React nodes for the App Router page. */
export function renderLegacyPageBody(
  pageKey: string,
  page: SitePageDocument | null,
  settings: SiteSettingsDocument | null,
  preview = false,
): ReactNode {
  const $ = load(renderLegacyPageHtml(pageKey, page, settings, preview), {}, false);
  return createElement(Fragment, null, ...childrenToReact($.root().contents().toArray() as AnyNode[]));
}
export function renderLegacyHead(pageKey: string): ReactNode {
  return createElement('head', { dangerouslySetInnerHTML: { __html: getLegacyPageShell(pageKey).headHtml } });
}
