import assert from 'node:assert/strict';
import test, { before } from 'node:test';
import { createEditUrl, studioPath } from '@sanity/client/csm';
import { decodeSanityNodeData } from '@sanity/visual-editing-csm';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { getHomePageData } from '../src/cms/home';
import type { HomePageSelection } from '../src/cms/types';
import { LEGACY_HOME_BODY_HTML } from '../src/components/legacyHomeTemplate';
import { HomeRendererError, renderHome } from '../src/components/renderHome';
import {
  PRESENTATION_PREVIEW_PATH,
  SANITY_STUDIO_BASE_PATH,
} from '../src/sanity/urls';

type ElementView = ReactElement<Record<string, unknown>>;

let publishedHome: HomePageSelection;

before(async () => {
  publishedHome = await getHomePageData(false);
});

function elementsIn(node: ReactNode): ElementView[] {
  const elements: ElementView[] = [];
  const visit = (value: ReactNode): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (isValidElement(value)) {
      const element = value as ElementView;
      elements.push(element);
      visit(element.props.children as ReactNode);
    }
  };
  visit(node);
  return elements;
}

function textContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (isValidElement(node)) return textContent((node as ElementView).props.children as ReactNode);
  return '';
}

function hasClass(element: ElementView, name: string): boolean {
  if (typeof element.type !== 'string') return false;
  const className = element.props.className;
  return typeof className === 'string' && className.split(/\s+/).includes(name);
}

function elementById(tree: ReactNode, id: string): ElementView {
  const found = elementsIn(tree).find((element) => element.props.id === id);
  assert.ok(found, `expected element #${id}`);
  return found;
}

function elementByClass(tree: ReactNode, className: string): ElementView {
  const found = elementsIn(tree).find((element) => hasClass(element, className));
  assert.ok(found, `expected element .${className}`);
  return found;
}

function descendants(root: ReactNode): ElementView[] {
  return elementsIn(root);
}

function heroProjection(tree: ReactNode) {
  const copy = elementByClass(tree, 'hero-copy');
  const body = descendants(copy).find((element) => element.type === 'p');
  assert.ok(body, 'expected hero body paragraph');
  const actions = elementByClass(tree, 'hero-actions');
  const ctas = descendants(actions).filter((element) => element.type === 'a');
  return {
    title: textContent(elementById(tree, 'hero-title').props.children as ReactNode),
    body: textContent(body.props.children as ReactNode),
    ctas: ctas.map((element) => ({
      label: textContent(element.props.children as ReactNode),
      href: element.props.href,
    })),
    galleryKeys: descendants(elementByClass(tree, 'home-about-gallery-group'))
      .filter((element) => hasClass(element, 'home-about-tile'))
      .map((element) => element.key),
    faqKeys: descendants(elementByClass(tree, 'home-faq'))
      .filter((element) => hasClass(element, 'home-faq-item'))
      .map((element) => element.key),
  };
}

function parseDataAttribute(element: ElementView) {
  const data = element.props['data-sanity'];
  assert.equal(typeof data, 'string', 'rendered element should carry a data-sanity attribute');
  const parsed = decodeSanityNodeData(data as string);
  assert.ok(parsed && 'baseUrl' in parsed, 'the Sanity Visual Editing parser should resolve the attribute');
  return parsed;
}

function assertOpenInStudioPath(element: ElementView, expectedPath: string): void {
  const node = parseDataAttribute(element);
  assert.equal(node.baseUrl, SANITY_STUDIO_BASE_PATH);
  assert.equal(node.id, 'homePage');
  assert.equal(node.type, 'homePage');
  assert.equal(node.path, expectedPath);

  const intent = createEditUrl({
    baseUrl: node.baseUrl,
    id: node.id,
    type: node.type ?? '',
    path: node.path,
  });
  assert.ok(intent.startsWith(`${SANITY_STUDIO_BASE_PATH}/intent/edit/`));

  for (const origin of ['http://localhost:3000', 'https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app']) {
    const previewUrl = new URL(PRESENTATION_PREVIEW_PATH, origin);
    const url = new URL(intent, previewUrl);
    assert.equal(url.origin, previewUrl.origin, 'Open in Studio should stay on the current local or Preview origin');
    assert.ok(url.pathname.startsWith(`${SANITY_STUDIO_BASE_PATH}/intent/edit/`));
    assert.equal(url.searchParams.get('baseUrl'), SANITY_STUDIO_BASE_PATH);
    assert.equal(url.searchParams.get('id'), 'homePage');
    assert.equal(url.searchParams.get('type'), 'homePage');
    const path = url.searchParams.get('path');
    assert.ok(path);
    assert.equal(studioPath.toString(studioPath.fromString(path)), expectedPath);
  }
}

test('layout-only template changes retain published content, CTA links, and array keys', () => {
  const originalInput = structuredClone(publishedHome);
  const originalTree = renderHome(publishedHome);
  const layoutTemplate = LEGACY_HOME_BODY_HTML.replace(
    'class="hero-actions"',
    'class="hero-actions" style="display:flex;flex-direction:row-reverse"',
  );
  assert.notEqual(layoutTemplate, LEGACY_HOME_BODY_HTML, 'the test must change the layout template');

  const layoutTree = renderHome(publishedHome, layoutTemplate);
  const original = heroProjection(originalTree);
  const changed = heroProjection(layoutTree);

  assert.deepEqual(changed, original);
  assert.deepEqual(original.galleryKeys, publishedHome.brandStory.gallery.map((item) => item._key));
  assert.deepEqual(original.faqKeys, publishedHome.faq.items.map((item) => item._key));
  assert.equal(elementByClass(layoutTree, 'hero-actions').props.style &&
    (elementByClass(layoutTree, 'hero-actions').props.style as Record<string, unknown>).flexDirection,
  'row-reverse');
  assert.deepEqual(publishedHome, originalInput, 'rendering must not mutate the published CMS object');
});

test('CMS text stays a React text node and unsafe CTA URLs are rejected', () => {
  const hostileText = '<img src=x onerror=alert(1)>';
  const withHostileText = structuredClone(publishedHome);
  withHostileText.hero.body = hostileText;

  const tree = renderHome(withHostileText);
  const body = descendants(elementByClass(tree, 'hero-copy')).find((element) => element.type === 'p');
  assert.ok(body, 'expected hero body paragraph');
  assert.equal(body.props.children, hostileText, 'untrusted CMS text must remain a plain React string');
  assert.equal(elementsIn(tree).filter((element) => element.type === 'img').length,
    elementsIn(renderHome(publishedHome)).filter((element) => element.type === 'img').length,
    'CMS text must not create additional image elements');

  const withUnsafeHref = structuredClone(publishedHome);
  withUnsafeHref.hero.primaryCta.href = 'javascript:alert(1)';
  assert.throws(() => renderHome(withUnsafeHref), HomeRendererError);
});

test('hero title, body, and images produce same-origin Studio edit intents under /studio', () => {
  const tree = renderHome(publishedHome);
  const title = elementById(tree, 'hero-title');
  const heroCopy = elementByClass(tree, 'hero-copy');
  const body = descendants(heroCopy).find((element) => element.type === 'p');
  assert.ok(body, 'expected the hero body paragraph');

  assertOpenInStudioPath(title, 'hero.titleLines');
  assertOpenInStudioPath(body, 'hero.body');

  const heroSlides = elementByClass(tree, 'hero-slides');
  const images = descendants(heroSlides).filter((element) => element.type === 'img');
  assert.equal(images.length, publishedHome.hero.slides.length);
  images.forEach((image, index) => {
    const slide = publishedHome.hero.slides[index];
    assertOpenInStudioPath(image, `hero.slides[_key=="${slide._key}"].image`);
  });
});

test('category image hit surfaces edit the image while preserving navigation and CTA bindings', () => {
  const tree = renderHome(publishedHome);
  const categories = descendants(elementByClass(tree, 'accordion')).filter((element) => hasClass(element, 'category'));
  assert.equal(categories.length, publishedHome.collection.categories.length);

  categories.forEach((category, index) => {
    const item = publishedHome.collection.categories[index];
    const imagePath = `collection.categories[_key=="${item._key}"].image`;
    const photo = descendants(category).find((element) => hasClass(element, 'category-photo'));
    const imageLink = descendants(category).find((element) => hasClass(element, 'category-image-link'));
    const ctaLink = descendants(category).find((element) => element.type === 'a' && hasClass(element, 'button'));

    assert.ok(photo, `category ${item._key} should render its image`);
    assert.ok(imageLink, `category ${item._key} should keep its image navigation link`);
    assert.ok(ctaLink, `category ${item._key} should keep its visible CTA link`);
    assert.equal(category.props['data-sanity'], undefined, 'the category article should not expose its technical identity field for editing');
    assert.equal(category.props['data-category'], item.category, 'the category identity used by the existing UI should remain intact');
    assertOpenInStudioPath(photo, imagePath);
    assertOpenInStudioPath(imageLink, imagePath);
    assert.equal(imageLink.props.href, item.cta.href, 'the image hit surface should keep its original navigation target');
    assertOpenInStudioPath(ctaLink, `collection.categories[_key=="${item._key}"].cta.href`);
    assert.equal(ctaLink.props.href, item.cta.href, 'the visible CTA should keep its original navigation target');
  });
});
