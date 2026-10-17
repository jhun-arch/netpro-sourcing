import assert from 'node:assert/strict';
import test from 'node:test';
import { createFullDocumentHistory } from '../src/components/fullDocumentHistory';

test('Presentation performs full document navigation and keeps browser history synchronized', () => {
  const navigations: Array<[string, string?]> = [];
  const listeners = new Map<string, () => void>();
  const browser = {
    location: {
      href: 'https://preview.example.test/about.html',
      origin: 'https://preview.example.test',
      assign: (url: string | URL) => { navigations.push(['assign', String(url)]); },
      replace: (url: string | URL) => { navigations.push(['replace', String(url)]); },
    },
    history: { back: () => { navigations.push(['back']); } },
    addEventListener: (event: string, listener: () => void) => { listeners.set(event, listener); },
    removeEventListener: (event: string) => { listeners.delete(event); },
  };
  const adapter = createFullDocumentHistory(() => browser);
  const notifications: unknown[] = [];
  const dispose = adapter.subscribe((update) => { notifications.push(update); });
  assert.deepEqual(notifications, [{ type: 'push', url: browser.location.href }]);
  adapter.update({ type: 'push', url: '/custom-t-shirts.html' });
  adapter.update({ type: 'replace', url: '/shop.html?category=clothing' });
  adapter.update({ type: 'pop', url: '/about.html' });
  assert.deepEqual(navigations, [
    ['assign', 'https://preview.example.test/custom-t-shirts.html'],
    ['replace', 'https://preview.example.test/shop.html?category=clothing'], ['back'],
  ]);
  listeners.get('popstate')?.();
  assert.deepEqual(notifications.at(-1), { type: 'pop', url: browser.location.href });
  dispose();
  assert.equal(listeners.size, 0);
});

test('Presentation cannot navigate to another origin or repeatedly reload its current page', () => {
  const fail = () => { throw new Error('Unexpected navigation'); };
  const adapter = createFullDocumentHistory(() => ({
    location: { href: 'https://preview.example.test/about.html', origin: 'https://preview.example.test', assign: fail, replace: fail },
    history: { back: fail }, addEventListener: fail, removeEventListener: fail,
  }));
  adapter.update({ type: 'push', url: 'https://untrusted.example.test/' });
  adapter.update({ type: 'push', url: 'javascript:alert(1)' });
  adapter.update({ type: 'push', url: 'http://[' });
  adapter.update({ type: 'push', url: 'blob:https://preview.example.test/example' });
  adapter.update({ type: 'replace', url: '/about.html' });
});
