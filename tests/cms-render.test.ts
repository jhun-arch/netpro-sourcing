import assert from 'node:assert/strict';
import test, { before } from 'node:test';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { getHomePageData } from '../src/cms/home';
import type { HomePageSelection } from '../src/cms/types';
import { LEGACY_HOME_BODY_HTML } from '../src/components/legacyHomeTemplate';
import { HomeRendererError, renderHome } from '../src/components/renderHome';

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
