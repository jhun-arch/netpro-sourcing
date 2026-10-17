import 'server-only';

import type { StudioPathLike } from '@sanity/client/csm';
import { getImageDimensions } from '@sanity/asset-utils';
import { createDataAttribute } from 'next-sanity';
import { load, type Cheerio, type CheerioAPI } from 'cheerio';
import type { Element as DomElement, AnyNode } from 'domhandler';
import { createElement, Fragment, type CSSProperties, type ReactNode } from 'react';
import { hotspotPosition, imageUrl } from '../cms/images';
import type { HomeCta, HomePageSelection, HomeCategory, SanityImage } from '../cms/types';
import { SANITY_STUDIO_BASE_PATH } from '../sanity/urls';
import { LEGACY_HOME_BODY_HTML } from './legacyHomeTemplate';

const DATA_ATTRIBUTE_CONFIG = {
  projectId: '5mntophk',
  dataset: 'production',
  id: 'homePage',
  type: 'homePage',
  baseUrl: SANITY_STUDIO_BASE_PATH,
} as const;

const BOOLEAN_ATTRIBUTES = new Set([
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
  'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'inert', 'ismap',
  'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open',
  'playsinline', 'readonly', 'required', 'reversed', 'selected',
]);

const REACT_ATTRIBUTE_NAMES: Record<string, string> = {
  acceptcharset: 'acceptCharset',
  accesskey: 'accessKey',
  autofocus: 'autoFocus',
  autocomplete: 'autoComplete',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  class: 'className',
  colspan: 'colSpan',
  contenteditable: 'contentEditable',
  crossorigin: 'crossOrigin',
  fetchpriority: 'fetchPriority',
  for: 'htmlFor',
  formnovalidate: 'formNoValidate',
  'http-equiv': 'httpEquiv',
  inputmode: 'inputMode',
  maxlength: 'maxLength',
  minlength: 'minLength',
  novalidate: 'noValidate',
  readonly: 'readOnly',
  rowspan: 'rowSpan',
  srcset: 'srcSet',
  tabindex: 'tabIndex',
  usemap: 'useMap',
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'xlink:href': 'xlinkHref',
  'xml:space': 'xmlSpace',
};

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);

type KeyedPathSegment = { _key: string };
type PathSegment = string | number | KeyedPathSegment;
type ImageRenderOptions = { maxDimension?: number; decorative?: boolean; highPriority?: boolean };
type ElementSelection = Cheerio<DomElement>;

export class HomeRendererError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HomeRendererError';
  }
}

function dataAttribute(path: StudioPathLike): string {
  return createDataAttribute({ ...DATA_ATTRIBUTE_CONFIG, path }).toString();
}

function setDataPath(target: ElementSelection, path: StudioPathLike): void {
  target.attr('data-sanity', dataAttribute(path));
}

function setReactKey(target: ElementSelection, key: string): void {
  target.attr('data-render-key', key);
}

function setText(target: ElementSelection, value: string, path: StudioPathLike): void {
  target.text(value);
  setDataPath(target, path);
}

function setAttributePath(target: ElementSelection, name: string, value: string, path: StudioPathLike): void {
  target.attr(name, value);
  setDataPath(target, path);
}

function safeHref(value: string): string {
  const href = value.trim();
  if (!href || /[\u0000-\u001f\u007f\\]/.test(href)) {
    throw new HomeRendererError('A homepage link is empty or malformed.');
  }

  if (/^https:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if (url.protocol === 'https:' && url.hostname) return url.toString();
    } catch {
      // The shared error below avoids including arbitrary CMS content in logs.
    }
    throw new HomeRendererError('A homepage link must use a valid HTTPS URL.');
  }

  if (/^mailto:/i.test(href)) {
    if (/^mailto:[^\s<>@]+@[^\s<>@]+(?:\?[^\s<>]*)?$/i.test(href)) return href;
    throw new HomeRendererError('A homepage email link is malformed.');
  }

  if (/^tel:/i.test(href)) {
    if (/^tel:[+0-9(). -]+$/i.test(href)) return href;
    throw new HomeRendererError('A homepage telephone link is malformed.');
  }

  if (href.startsWith('//') || href.startsWith('\\')) {
    throw new HomeRendererError('Homepage links cannot use protocol-relative URLs.');
  }

  if (href === '/') return href;

  if (/^(?:#|\/(?!\/)|\.\.?\/)?[a-z0-9][a-z0-9._~/%?&=+#-]*$/i.test(href)) {
    return href;
  }

  throw new HomeRendererError('A homepage link must be a safe site-relative path or HTTPS URL.');
}

function setHref(target: ElementSelection, value: string, path: StudioPathLike): void {
  setAttributePath(target, 'href', safeHref(value), path);
}

function setCtaText(
  $: CheerioAPI,
  target: ElementSelection,
  value: string,
  path: StudioPathLike,
): void {
  const existingIcon = target.find('svg').first().clone();
  const label = $('<span>');
  setText(label as ElementSelection, value, path);
  target.empty().append(label);
  if (existingIcon.length) target.append(existingIcon);
}

function setCta(
  $: CheerioAPI,
  target: ElementSelection,
  cta: HomeCta,
  path: PathSegment[],
  textTarget?: ElementSelection,
): void {
  const labelTarget = textTarget ?? target;
  if (textTarget) setText(textTarget, cta.label, [...path, 'label']);
  else setCtaText($, labelTarget, cta.label, [...path, 'label']);
  setHref(target, cta.href, [...path, 'href']);
}

function selectorRequired($: CheerioAPI, selector: string): ElementSelection {
  const result = $(selector) as ElementSelection;
  if (!result.length) throw new HomeRendererError(`The homepage template is missing ${selector}.`);
  return result.first();
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

function writeStyle(target: ElementSelection, values: Record<string, string>): void {
  target.attr('style', Object.entries(values).map(([key, value]) => `${key}: ${value}`).join('; '));
}

function requireDimensions(image: SanityImage): { width: number; height: number } {
  const metadataDimensions = image.asset?.metadata?.dimensions;
  if (
    metadataDimensions && Number.isFinite(metadataDimensions.width) && Number.isFinite(metadataDimensions.height)
    && metadataDimensions.width >= 1 && metadataDimensions.height >= 1
  ) {
    return { width: Math.round(metadataDimensions.width), height: Math.round(metadataDimensions.height) };
  }

  const assetReference = image.asset?._ref;
  const assetId = image.asset?._id;
  if (!assetReference && !assetId) {
    throw new HomeRendererError('A homepage image is missing its Sanity asset dimensions.');
  }
  try {
    const dimensions = getImageDimensions(assetReference ? { _ref: assetReference, _type: 'reference' } : assetId!);
    if (dimensions.width >= 1 && dimensions.height >= 1) {
      return { width: Math.round(dimensions.width), height: Math.round(dimensions.height) };
    }
  } catch {
    // Surface a stable setup error rather than the asset-utils input or ID.
  }
  throw new HomeRendererError('A homepage image has an invalid Sanity asset reference.');
}

function optimizedImageSize(image: SanityImage, maxDimension: number): { width: number; height: number } {
  const source = requireDimensions(image);
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

function bindImage(
  target: ElementSelection,
  image: SanityImage,
  path: PathSegment[],
  alt: string,
  options: ImageRenderOptions = {},
): void {
  const dimensions = requireDimensions(image);
  const optimizedSize = optimizedImageSize(image, options.maxDimension ?? 1600);
  target.attr('src', imageUrl(image, optimizedSize));
  target.attr('alt', options.decorative ? '' : image.alt?.trim() || alt);
  target.attr('width', String(dimensions.width));
  target.attr('height', String(dimensions.height));
  target.attr('decoding', 'async');
  if (options.highPriority) target.attr('fetchpriority', 'high');
  const style = parseStyle(target.attr('style'));
  style['object-position'] = hotspotPosition(image);
  writeStyle(target, style);
  setDataPath(target, path);
}

function bindBackgroundImage(
  target: ElementSelection,
  image: SanityImage,
  path: PathSegment[],
): void {
  const url = imageUrl(image, optimizedImageSize(image, 1400));
  const style = parseStyle(target.attr('style'));
  style['background-image'] = `url("${url}")`;
  style['background-position'] = hotspotPosition(image);
  style['background-size'] = 'cover';
  writeStyle(target, style);
  setDataPath(target, path);
}

function setTitleLines(
  $: CheerioAPI,
  target: ElementSelection,
  lines: string[],
  path: PathSegment[],
  separator: 'break' | 'block',
): void {
  target.empty();
  lines.forEach((line, index) => {
    if (separator === 'break' && index > 0) target.append($('<br>'));
    const lineElement = $('<span>');
    setText(lineElement as ElementSelection, line, [...path, index]);
    target.append(lineElement);
  });
  setDataPath(target, path);
}

function idToken(value: string, fallback: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function replaceRepeatedItems<T extends { _key: string }>(
  $: CheerioAPI,
  container: ElementSelection,
  selector: string,
  items: T[],
  createItem: (template: ElementSelection, item: T, index: number) => ElementSelection,
): void {
  const originalItems = container.children(selector).toArray();
  if (!originalItems.length && items.length) {
    throw new HomeRendererError(`The homepage template is missing a source item for ${selector}.`);
  }
  const template = $(originalItems[0]).clone() as ElementSelection;
  container.empty();
  items.forEach((item, index) => {
    const original = originalItems[index] ?? originalItems[0];
    const clone = $(original).clone() as ElementSelection;
    const created = createItem(clone.length ? clone : template.clone() as ElementSelection, item, index);
    setReactKey(created, item._key);
    container.append(created);
  });
}

function bindHero($: CheerioAPI, data: HomePageSelection): void {
  const section = selectorRequired($, '.hero');
  const slides = section.find('.hero-slides');
  const originals = slides.children('img').toArray();
  if (!originals.length && data.hero.slides.length) throw new HomeRendererError('The homepage hero template has no image slots.');
  const imageTemplate = $(originals[0]).clone() as ElementSelection;
  slides.empty();
  data.hero.slides.forEach((slide, index) => {
    const base = $(originals[index] ?? originals[0]).clone() as ElementSelection;
    base.toggleClass('is-active', index === 0);
    bindImage(base, slide.image, ['hero', 'slides', { _key: slide._key }, 'image'], '', {
      maxDimension: 2200,
      decorative: true,
      highPriority: index === 0,
    });
    setReactKey(base, slide._key);
    slides.append(base.length ? base : imageTemplate.clone() as ElementSelection);
  });

  setTitleLines($, section.find('#hero-title'), data.hero.titleLines, ['hero', 'titleLines'], 'block');
  setText(section.find('.hero-copy > p'), data.hero.body, ['hero', 'body']);
  setCta($, section.find('.hero-actions a').eq(0) as ElementSelection, data.hero.primaryCta, ['hero', 'primaryCta']);
  setCta(
    $,
    section.find('.hero-actions a').eq(1) as ElementSelection,
    data.hero.secondaryCta,
    ['hero', 'secondaryCta'],
    section.find('.hero-actions a').eq(1).find('.cta-label') as ElementSelection,
  );
}

function bindCollection($: CheerioAPI, data: HomePageSelection): void {
  const section = selectorRequired($, '.home-story');
  setText(section.find('.home-story-copy > .eyebrow'), data.collection.eyebrow, ['collection', 'eyebrow']);
  setTitleLines($, section.find('#catalog-title'), data.collection.titleLines, ['collection', 'titleLines'], 'break');
  setText(section.find('.home-story-copy > p').last(), data.collection.body, ['collection', 'body']);
  setCta($, section.find('.home-story-link') as ElementSelection, data.collection.cta, ['collection', 'cta']);

  const accordion = section.find('.accordion') as ElementSelection;
  const original = accordion.children('.category').toArray();
  const template = $(original[0]).clone() as ElementSelection;
  accordion.empty();
  data.collection.categories.forEach((item, index) => {
    const category = item.category;
    const row = $(original[index] ?? original[0]).clone() as ElementSelection;
    const active = index === 0;
    const token = idToken(item.slug || category, category);
    row.attr('class', `category${active ? ' is-active' : ''}`);
    row.attr('data-category', category);
    setDataPath(row, ['collection', 'categories', { _key: item._key }, 'category']);
    setReactKey(row, item._key);

    const photoClass = category === 'patches' ? 'patch-photo' : `${category}-photo`;
    const photo = row.find('.category-photo');
    const imagePath: PathSegment[] = ['collection', 'categories', { _key: item._key }, 'image'];
    photo.attr('class', `category-photo ${photoClass}`);
    photo.attr('role', 'img');
    photo.attr('aria-label', item.image.alt?.trim() || item.title);
    bindBackgroundImage(photo as ElementSelection, item.image, imagePath);

    const imageLink = row.find('.category-image-link');
    // The full-card link sits above the image in the visual stack. Keep its destination,
    // but let Presentation edit the image field reached by clicking that hit surface.
    imageLink.attr('href', safeHref(item.cta.href));
    imageLink.attr('aria-label', item.cta.label);
    setDataPath(imageLink as ElementSelection, imagePath);

    const toggle = row.find('.category-toggle');
    const toggleId = `category-${token}`;
    const panelId = `panel-${token}`;
    toggle.attr({ id: toggleId, 'aria-expanded': String(active), 'aria-controls': panelId });
    setText(toggle.find('span').first() as ElementSelection, item.title, ['collection', 'categories', { _key: item._key }, 'title']);

    const panel = row.find('.category-details');
    panel.attr({ id: panelId, 'aria-labelledby': toggleId });
    if (active) panel.removeAttr('inert');
    else panel.attr('inert', '');
    setText(panel.find('h4') as ElementSelection, item.title, ['collection', 'categories', { _key: item._key }, 'title']);
    setText(panel.find('p') as ElementSelection, item.description, ['collection', 'categories', { _key: item._key }, 'description']);
    const categoryCta = panel.find('a.button') as ElementSelection;
    setCta($, categoryCta, item.cta, ['collection', 'categories', { _key: item._key }, 'cta']);
    categoryCta.attr('tabindex', active ? '0' : '-1');
    accordion.append(row.length ? row : template.clone() as ElementSelection);
  });
}

function bindProcess($: CheerioAPI, data: HomePageSelection): void {
  const section = selectorRequired($, '.home-process');
  setTitleLines($, section.find('#process-title'), data.process.titleLines, ['process', 'titleLines'], 'block');
  setText(section.find('.home-process-heading > p'), data.process.body, ['process', 'body']);

  const figure = section.find('.home-process-visual');
  const stage = figure.find('.home-process-image-stage') as ElementSelection;
  const originalImages = stage.children('img').toArray();
  const imageTemplate = $(originalImages[0]).clone() as ElementSelection;
  stage.empty();
  data.process.steps.forEach((step, index) => {
    const image = $(originalImages[index] ?? originalImages[0]).clone() as ElementSelection;
    image.attr('data-process-image', String(index));
    image.toggleClass('is-active', index === 0);
    image.attr('aria-hidden', String(index !== 0));
    bindImage(image, step.image, ['process', 'steps', { _key: step._key }, 'image'], step.title, { maxDimension: 1600 });
    setReactKey(image, step._key);
    stage.append(image.length ? image : imageTemplate.clone() as ElementSelection);
  });
  figure.attr('data-active', '0');

  const list = section.find('.home-process-steps') as ElementSelection;
  const originals = list.children('.home-process-step').toArray();
  const stepTemplate = $(originals[0]).clone() as ElementSelection;
  list.empty();
  data.process.steps.forEach((step, index) => {
    const item = $(originals[index] ?? originals[0]).clone() as ElementSelection;
    const active = index === 0;
    const token = idToken(step.slug, `step-${index + 1}`);
    const toggleId = `process-step-${token}`;
    const panelId = `process-panel-${token}`;
    item.toggleClass('is-open', active);
    const toggle = item.find('.home-process-step-toggle');
    toggle.attr({
      id: toggleId,
      'aria-expanded': String(active),
      'aria-controls': panelId,
      'data-process-toggle': String(index),
    });
    const number = item.find('.home-process-step-number');
    number.text(String(index + 1).padStart(2, '0'));
    setText(item.find('.home-process-step-title') as ElementSelection, step.title, ['process', 'steps', { _key: step._key }, 'title']);
    const panel = item.find('.home-process-step-panel');
    panel.attr({ id: panelId, 'aria-labelledby': toggleId, 'aria-hidden': String(!active) });
    panel.toggleClass('is-open', active);
    if (active) panel.removeAttr('inert');
    else panel.attr('inert', '');
    setText(panel.find('p') as ElementSelection, step.body, ['process', 'steps', { _key: step._key }, 'body']);
    setDataPath(item, ['process', 'steps', { _key: step._key }]);
    setReactKey(item, step._key);
    list.append(item.length ? item : stepTemplate.clone() as ElementSelection);
  });

  const actions = section.find('.home-process-actions');
  setCta(
    $,
    actions.find('a').eq(0) as ElementSelection,
    data.process.primaryCta,
    ['process', 'primaryCta'],
    actions.find('a').eq(0).find('.cta-label') as ElementSelection,
  );
  setCta(
    $,
    actions.find('a').eq(1) as ElementSelection,
    data.process.secondaryCta,
    ['process', 'secondaryCta'],
    actions.find('a').eq(1).find('.cta-label') as ElementSelection,
  );
}

function bindStartingPoints($: CheerioAPI, data: HomePageSelection): void {
  const section = selectorRequired($, '.home-starting-points');
  const intro = section.find('.home-starting-points-intro');
  setText(intro.find('.eyebrow'), data.startingPoints.eyebrow, ['startingPoints', 'eyebrow']);
  setText(intro.find('h2'), data.startingPoints.title, ['startingPoints', 'title']);
  setText(intro.find('p').last(), data.startingPoints.body, ['startingPoints', 'body']);

  const grid = section.find('.service-grid') as ElementSelection;
  const originals = grid.children('.process-card').toArray();
  const template = $(originals[0]).clone() as ElementSelection;
  grid.empty();
  data.startingPoints.items.forEach((item, index) => {
    const card = $(originals[index] ?? originals[0]).clone() as ElementSelection;
    setText(card.find('.process-copy h3') as ElementSelection, item.title, ['startingPoints', 'items', { _key: item._key }, 'title']);
    setText(card.find('.process-copy p') as ElementSelection, item.body, ['startingPoints', 'items', { _key: item._key }, 'body']);
    const image = card.find('img');
    bindImage(image as ElementSelection, item.image, ['startingPoints', 'items', { _key: item._key }, 'image'], item.title, { maxDimension: 1600 });
    setCta($, card.find('.process-copy a') as ElementSelection, item.cta, ['startingPoints', 'items', { _key: item._key }, 'cta']);
    setDataPath(card, ['startingPoints', 'items', { _key: item._key }]);
    setReactKey(card, item._key);
    grid.append(card.length ? card : template.clone() as ElementSelection);
  });
}

function bindBrandStory($: CheerioAPI, data: HomePageSelection): void {
  const section = selectorRequired($, '.home-about');
  const heading = section.find('#sourcing-title') as ElementSelection;
  const visual = heading.find('.home-about-visual').first().clone() as ElementSelection;
  visual.empty();
  const words = data.brandStory.title.trim().split(/\s+/).filter(Boolean);
  for (const [index, word] of words.entries()) {
    if (index > 0) visual.append(' ');
    const wordElement = $('<span>').addClass('home-about-word').attr('data-home-about-word', '');
    if (/^(clothing,?|headwear,?|socks,?|patches\.?|patches,)$/i.test(word)) wordElement.addClass('home-about-color-word');
    setText(wordElement as ElementSelection, word, ['brandStory', 'title']);
    visual.append(wordElement);
  }
  heading.empty().append(visual);
  heading.attr('aria-label', data.brandStory.title);
  setDataPath(heading, ['brandStory', 'title']);

  setText(section.find('.home-about-support > p'), data.brandStory.body, ['brandStory', 'body']);
  setCta($, section.find('.home-about-actions a') as ElementSelection, data.brandStory.cta, ['brandStory', 'cta']);

  const filterList = section.find('.home-about-filters') as ElementSelection;
  const oldFilters = filterList.children('button').toArray();
  const filterTemplate = $(oldFilters[0]).clone() as ElementSelection;
  filterList.empty();
  data.brandStory.galleryFilters.forEach((filter, index) => {
    const button = $(oldFilters[index] ?? oldFilters[0]).clone() as ElementSelection;
    button.attr({
      type: 'button',
      'data-gallery-filter': filter.category,
      'aria-pressed': String(filter.category === 'all'),
      disabled: '',
    });
    button.empty();
    const label = $('<span>');
    setText(label as ElementSelection, filter.label, ['brandStory', 'galleryFilters', { _key: filter._key }, 'label']);
    button.append(label);
    setDataPath(button, ['brandStory', 'galleryFilters', { _key: filter._key }, 'category']);
    setReactKey(button, filter._key);
    filterList.append(button.length ? button : filterTemplate.clone() as ElementSelection);
  });

  const group = section.find('[data-gallery-group]').first() as ElementSelection;
  const oldTiles = group.children('[data-gallery-item]').toArray();
  if (!oldTiles.length && data.brandStory.gallery.length) throw new HomeRendererError('The homepage gallery template has no source image tiles.');
  const tileTemplate = $(oldTiles[0]).clone() as ElementSelection;
  group.empty();
  data.brandStory.gallery.forEach((item, index) => {
    const tile = $(oldTiles[index] ?? oldTiles[index % oldTiles.length]).clone() as ElementSelection;
    tile.attr({
      href: safeHref(item.href),
      'data-category': item.category,
      'aria-label': item.linkLabel,
    });
    setDataPath(tile, ['brandStory', 'gallery', { _key: item._key }, 'href']);
    const image = tile.find('img');
    bindImage(image as ElementSelection, item.image, ['brandStory', 'gallery', { _key: item._key }, 'image'], item.caption, { maxDimension: 1200 });
    const caption = tile.find('.home-about-tile-caption');
    const icon = caption.find('svg').first().clone();
    caption.empty();
    const captionText = $('<span>');
    setText(captionText as ElementSelection, item.caption, ['brandStory', 'gallery', { _key: item._key }, 'caption']);
    caption.append(captionText).append(' ');
    if (icon.length) caption.append(icon);
    const accessibleLabel = $('<span>').addClass('sr-only');
    setText(accessibleLabel as ElementSelection, item.linkLabel, ['brandStory', 'gallery', { _key: item._key }, 'linkLabel']);
    tile.append(accessibleLabel);
    tile.attr('data-render-key', item._key);
    group.append(tile.length ? tile : tileTemplate.clone() as ElementSelection);
  });
}

function bindBenefits($: CheerioAPI, data: HomePageSelection): void {
  const section = selectorRequired($, '.home-why');
  const intro = section.find('.home-why-intro');
  setText(intro.find('h2'), data.benefits.intro.title, ['benefits', 'intro', 'title']);
  setText(intro.find('.home-why-lead'), data.benefits.intro.body, ['benefits', 'intro', 'body']);

  const capabilities = intro.find('.home-why-capabilities') as ElementSelection;
  const originalCapabilities = capabilities.children('li').toArray();
  const capabilityTemplate = $(originalCapabilities[0]).clone() as ElementSelection;
  capabilities.empty();
  data.benefits.intro.capabilities.forEach((value, index) => {
    const item = $(originalCapabilities[index] ?? originalCapabilities[0]).clone() as ElementSelection;
    setText(item as ElementSelection, value, ['benefits', 'intro', 'capabilities', index]);
    setReactKey(item as ElementSelection, `capability-${index}`);
    capabilities.append(item.length ? item : capabilityTemplate.clone() as ElementSelection);
  });

  const list = section.find('.home-why-list') as ElementSelection;
  replaceRepeatedItems($, list, 'li.home-why-item', data.benefits.items, (item, benefit) => {
    setText(item.find('h3') as ElementSelection, benefit.title, ['benefits', 'items', { _key: benefit._key }, 'title']);
    setText(item.find('div > p') as ElementSelection, benefit.body, ['benefits', 'items', { _key: benefit._key }, 'body']);
    setDataPath(item, ['benefits', 'items', { _key: benefit._key }]);
    return item;
  });
}

function bindFaq($: CheerioAPI, data: HomePageSelection): void {
  const section = selectorRequired($, '.home-faq');
  setText(section.find('#home-faq-title'), data.faq.title, ['faq', 'title']);
  const contact = section.find('.home-faq-contact');
  setText(contact.find('h3'), data.faq.contactTitle, ['faq', 'contactTitle']);
  setText(contact.find('p'), data.faq.contactBody, ['faq', 'contactBody']);
  setCta($, contact.find('a') as ElementSelection, data.faq.contactCta, ['faq', 'contactCta']);

  const list = section.find('[data-faq-list]') as ElementSelection;
  replaceRepeatedItems($, list, '.home-faq-item', data.faq.items, (item, faq, index) => {
    const token = idToken(faq.slug, `question-${index + 1}`);
    const questionId = `home-faq-question-${token}`;
    const answerId = `home-faq-answer-${token}`;
    item.toggleClass('is-open', index === 0);
    const toggle = item.find('.home-faq-toggle');
    toggle.attr({ id: questionId, type: 'button', 'aria-expanded': String(index === 0), 'aria-controls': answerId });
    setText(toggle.find('span').first() as ElementSelection, faq.question, ['faq', 'items', { _key: faq._key }, 'question']);
    const answer = item.find('.home-faq-answer');
    answer.attr({ id: answerId, 'aria-labelledby': questionId });
    if (index === 0) answer.removeAttr('inert');
    else answer.attr('inert', '');
    setText(answer.find('p') as ElementSelection, faq.answer, ['faq', 'items', { _key: faq._key }, 'answer']);
    setDataPath(item, ['faq', 'items', { _key: faq._key }]);
    return item;
  });
  setCta($, section.find('.home-faq-guide') as ElementSelection, data.faq.guideCta, ['faq', 'guideCta']);
}

function bindClosingCta($: CheerioAPI, data: HomePageSelection): void {
  const section = selectorRequired($, '.closing-cta');
  setTitleLines($, section.find('#closing-title'), data.closingCta.titleLines, ['closingCta', 'titleLines'], 'break');
  setCta($, section.find('.closing-actions a') as ElementSelection, data.closingCta.cta, ['closingCta', 'cta']);
}

function bindFooter($: CheerioAPI, data: HomePageSelection): void {
  const footer = selectorRequired($, '.home-footer');
  setText(footer.find('.home-footer-brand > p'), data.footer.description, ['footer', 'description']);

  const subscribe = footer.find('.home-footer-subscribe');
  setText(subscribe.find('h2'), data.footer.newsletterTitle, ['footer', 'newsletterTitle']);
  setText(subscribe.find('p'), data.footer.newsletterDescription, ['footer', 'newsletterDescription']);
  setAttributePath(subscribe.find('input'), 'placeholder', data.footer.emailPlaceholder, ['footer', 'emailPlaceholder']);
  const subscribeButton = subscribe.find('.footer-signup-button') as ElementSelection;
  const subscribeIcon = subscribeButton.find('svg').first().clone();
  subscribeButton.text(data.footer.subscribeLabel);
  if (subscribeIcon.length) subscribeButton.append(subscribeIcon);
  setDataPath(subscribeButton, ['footer', 'subscribeLabel']);

  const email = footer.find('.home-footer-contact .contact-email') as ElementSelection;
  const emailHref = safeHref(`mailto:${data.footer.contactEmail}`);
  setAttributePath(email, 'href', emailHref, ['footer', 'contactEmail']);
  setText(email, data.footer.contactEmail, ['footer', 'contactEmail']);

  const address = footer.find('.home-footer-contact address') as ElementSelection;
  address.empty();
  data.footer.addressLines.forEach((line, index) => {
    if (index > 0) address.append($('<br>'));
    const addressLine = $('<span>');
    setText(addressLine as ElementSelection, line, ['footer', 'addressLines', index]);
    address.append(addressLine);
  });

  const manager = footer.find('.home-footer-contact .contact-person') as ElementSelection;
  manager.empty();
  const managerLabel = $('<span>');
  setText(managerLabel as ElementSelection, data.footer.managerLabel, ['footer', 'managerLabel']);
  const managerName = $('<span>');
  setText(managerName as ElementSelection, data.footer.managerName, ['footer', 'managerName']);
  manager.append(managerLabel).append(': ').append(managerName);

  const socialList = footer.find('.footer-social-links') as ElementSelection;
  const originalSocials = socialList.children('.footer-social-icon').toArray();
  const socialByKey = new Map(originalSocials.map((node) => [($(node).attr('data-social') ?? '').toLowerCase(), node]));
  socialList.empty();
  data.footer.socialLinks.forEach((social) => {
    const source = socialByKey.get(social.iconKey.toLowerCase());
    if (!source) throw new HomeRendererError('A footer social icon uses an unsupported icon key.');
    const link = $(source).clone() as ElementSelection;
    const icon = link.find('svg').first().clone();
    link.attr({ 'data-social': social.iconKey, 'aria-label': social.label });
    setHref(link, social.href, ['footer', 'socialLinks', { _key: social._key }, 'href']);
    link.empty();
    const label = $('<span>').addClass('sr-only');
    setText(label as ElementSelection, social.label, ['footer', 'socialLinks', { _key: social._key }, 'label']);
    link.append(label);
    if (icon.length) {
      setDataPath(icon as ElementSelection, ['footer', 'socialLinks', { _key: social._key }, 'iconKey']);
      link.append(icon);
    }
    setReactKey(link, social._key);
    socialList.append(link);
  });

  const footerGrid = footer.find('.footer-grid') as ElementSelection;
  const originalColumns = footerGrid.children('.footer-column').toArray();
  const columnTemplate = $(originalColumns[0]).clone() as ElementSelection;
  footerGrid.children('.footer-column').remove();
  data.footer.columns.forEach((column, index) => {
    const nav = $(originalColumns[index] ?? originalColumns[0]).clone() as ElementSelection;
    const heading = nav.find('h2').first().clone() as ElementSelection;
    nav.empty().append(heading);
    setText(heading, column.title, ['footer', 'columns', { _key: column._key }, 'title']);
    setAttributePath(nav, 'aria-label', column.title, ['footer', 'columns', { _key: column._key }, 'title']);
    for (const link of column.links) {
      const anchor = $('<a>');
      setText(anchor as ElementSelection, link.label, ['footer', 'columns', { _key: column._key }, 'links', { _key: link._key }, 'label']);
      setHref(anchor as ElementSelection, link.href, ['footer', 'columns', { _key: column._key }, 'links', { _key: link._key }, 'href']);
      setReactKey(anchor as ElementSelection, link._key);
      nav.append(anchor);
    }
    setDataPath(nav, ['footer', 'columns', { _key: column._key }]);
    setReactKey(nav, column._key);
    footerGrid.append(nav.length ? nav : columnTemplate.clone() as ElementSelection);
  });

  setText(footer.find('.footer-bottom > span'), data.footer.copyright, ['footer', 'copyright']);
  const legalLink = footer.find('.home-footer-legal a') as ElementSelection;
  setCta($, legalLink, data.footer.legalLink, ['footer', 'legalLink']);
  setText(footer.find('.home-footer-legal > span'), data.footer.tagline, ['footer', 'tagline']);
}

function camelCaseStyleName(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function reactStyle(styleText: string): CSSProperties {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(parseStyle(styleText))) {
    result[camelCaseStyleName(name)] = value.replace(/\s*!important\s*$/i, '');
  }
  return result as CSSProperties;
}

function convertAttributeName(name: string): string {
  return REACT_ATTRIBUTE_NAMES[name.toLowerCase()] ?? name;
}

function convertNode(node: AnyNode, indexPath: string): ReactNode {
  if (node.type === 'text') return node.data;
  if (node.type === 'comment' || node.type === 'directive') return null;

  const element = node as DomElement;
  if (!element.name) {
    return element.children?.map((child, index) => convertNode(child, `${indexPath}.${index}`)) ?? null;
  }

  const props: Record<string, unknown> = {};
  const attributes = { ...element.attribs };
  const key = attributes['data-render-key'] ?? indexPath;
  delete attributes['data-render-key'];

  for (const [name, value] of Object.entries(attributes)) {
    if (name.toLowerCase() === 'style') {
      props.style = reactStyle(value);
      continue;
    }
    const propName = convertAttributeName(name);
    props[propName] = BOOLEAN_ATTRIBUTES.has(name.toLowerCase()) ? true : value;
  }
  props.key = key;

  // Cheerio treats noscript contents as raw text. React would escape that text
  // again, producing markup that differs from the browser's noscript parsing.
  // This note is fixed template content and never comes from the CMS.
  if (element.name.toLowerCase() === 'noscript') {
    const rawContent = (element.children ?? [])
      .filter((child) => child.type === 'text')
      .map((child) => child.data)
      .join('');
    const note = rawContent.match(/<p\b[^>]*class=["'][^"']*\bnoscript-note\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    const noteText = note?.[1] ?? 'Enable JavaScript to explore the collection, open product details and build an enquiry list.';
    return createElement('noscript', props, createElement('p', { className: 'noscript-note' }, noteText));
  }

  if (VOID_ELEMENTS.has(element.name.toLowerCase())) {
    return createElement(element.name, props as Record<string, never>);
  }

  const children = (element.children ?? []).map((child, index) => convertNode(child, `${indexPath}.${index}`));
  return createElement(element.name, props as Record<string, never>, ...children);
}

/** Bind the full legacy homepage template to validated CMS values and return a React tree. */
export function renderHome(data: HomePageSelection, templateHtml = LEGACY_HOME_BODY_HTML): ReactNode {
  const $ = load(templateHtml);
  bindHero($, data);
  bindCollection($, data);
  bindProcess($, data);
  bindStartingPoints($, data);
  bindBrandStory($, data);
  bindBenefits($, data);
  bindFaq($, data);
  bindClosingCta($, data);
  bindFooter($, data);

  const body = $('body').get(0);
  if (!body) throw new HomeRendererError('The legacy homepage template could not be parsed.');
  const children = body.children.map((node, index) => convertNode(node, `home-${index}`));
  return createElement(Fragment, null, ...children);
}
