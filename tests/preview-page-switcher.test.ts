import assert from 'node:assert/strict';
import test from 'node:test';
import { act, createElement, type ComponentType } from 'react';
import {
  getPreviewPageRoute,
  getPreviewPageKeyForPath,
  navigateToPreviewPage,
  PREVIEW_PAGE_OPTIONS,
} from '../src/components/previewNavigation';

test('draft page switcher lists the homepage and all registered legacy pages', () => {
  assert.equal(PREVIEW_PAGE_OPTIONS.length, 38);
  assert.equal(PREVIEW_PAGE_OPTIONS[0]?.pageKey, 'home');
  assert.equal(PREVIEW_PAGE_OPTIONS[0]?.route, '/');
  assert.equal(getPreviewPageRoute('about'), '/about.html');
  assert.equal(getPreviewPageKeyForPath('/shop.html'), 'shop');
  assert.equal(getPreviewPageKeyForPath('/unknown.html'), '');
});

test('page switcher uses full-document routes and ignores an unknown selection', () => {
  const navigations: string[] = [];
  const assign = (route: string) => navigations.push(route);

  assert.equal(navigateToPreviewPage('contact', assign), true);
  assert.equal(navigateToPreviewPage('missing', assign), false);
  assert.deepEqual(navigations, ['/contact.html']);
});

test('the rendered page switcher selects by pageKey and navigates to the registered full-document route', async () => {
  const jsdomModuleName = 'jsdom';
  const { JSDOM } = await import(jsdomModuleName);
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'https://preview.example.test/about.html',
  });
  const browserGlobals = globalThis as typeof globalThis & Record<string, unknown>;
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const installGlobal = (name: string, value: unknown) => {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };

  installGlobal('window', dom.window);
  installGlobal('document', dom.window.document);
  installGlobal('navigator', dom.window.navigator);
  installGlobal('HTMLElement', dom.window.HTMLElement);
  installGlobal('Node', dom.window.Node);
  installGlobal('IS_REACT_ACT_ENVIRONMENT', true);

  try {
    const { createRoot } = await import('react-dom/client');
    const { default: PreviewPageSwitcher } = await import('../src/components/PreviewPageSwitcher');
    const PageSwitcher = PreviewPageSwitcher as ComponentType<{ navigate?: (route: string) => void }>;
    const container = dom.window.document.getElementById('root');
    assert.ok(container);
    const root = createRoot(container);
    const navigations: string[] = [];

    await act(async () => {
      root.render(createElement(PageSwitcher, { navigate: (route: string) => navigations.push(route) }));
    });

    const select = dom.window.document.querySelector('select[aria-label="切换预览页面"]') as HTMLSelectElement | null;
    assert.ok(select);
    assert.equal(select.value, 'about');
    select.value = 'shop';
    await act(async () => {
      select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    });

    assert.deepEqual(navigations, ['/shop.html']);
    await act(async () => root.unmount());
  } finally {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(browserGlobals, name);
    }
    dom.window.close();
  }
});
