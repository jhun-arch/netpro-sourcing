import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
  contentRevisionQuery,
  isRevisionPageKey,
  serializeScopedRevision,
  scopeRevisionDocuments,
} from '../src/cms/revisionScope';

const documentFixtures = [
  { _id: 'siteSettings', _rev: 'settings-1', _type: 'siteSettings' },
  { _id: 'product-a', _rev: 'product-1', _type: 'product' },
  { _id: 'category-a', _rev: 'category-1', _type: 'productCategory' },
  { _id: 'style-a', _rev: 'style-1', _type: 'catalogStyle' },
  { _id: 'homePage', _rev: 'home-1', _type: 'homePage' },
  { _id: 'sitePage-about', _rev: 'about-1', _type: 'sitePage', pageKey: 'about' },
  { _id: 'sitePage-shop', _rev: 'shop-1', _type: 'sitePage', pageKey: 'shop' },
];

function revisionFor(documents: typeof documentFixtures, pageKey: string): string {
  return createHash('sha256').update(serializeScopedRevision(documents, pageKey)).digest('hex');
}

test('revision scopes include shared/catalog documents and only the requested page', () => {
  const about = scopeRevisionDocuments(documentFixtures, 'about');
  assert.deepEqual(about.map((document) => document._id), [
    'category-a', 'product-a', 'sitePage-about', 'siteSettings', 'style-a',
  ]);
  assert.deepEqual(scopeRevisionDocuments(documentFixtures, 'home').map((document) => document._id), [
    'category-a', 'homePage', 'product-a', 'siteSettings', 'style-a',
  ]);
  assert.match(contentRevisionQuery, /\$pageKey != "home" && _type == "sitePage" && pageKey == \$pageKey/);
  assert.equal(isRevisionPageKey('custom-t-shirts'), true);
  assert.equal(isRevisionPageKey('unknown-page'), false);
});

test('an unrelated page change leaves the current preview revision stable; its own page change refreshes', () => {
  const current = revisionFor(documentFixtures, 'about');
  const unrelatedPageChanged = documentFixtures.map((document) => document._id === 'sitePage-shop'
    ? { ...document, _rev: 'shop-2' }
    : document);
  const currentPageChanged = documentFixtures.map((document) => document._id === 'sitePage-about'
    ? { ...document, _rev: 'about-2' }
    : document);

  assert.equal(revisionFor(unrelatedPageChanged, 'about'), current);
  assert.notEqual(revisionFor(currentPageChanged, 'about'), current);
});

test('shared or catalog changes still refresh the scoped preview', () => {
  const current = revisionFor(documentFixtures, 'about');
  for (const changedId of ['siteSettings', 'product-a', 'category-a', 'style-a']) {
    const updated = documentFixtures.map((document) => document._id === changedId
      ? { ...document, _rev: `${document._rev}-changed` }
      : document);
    assert.notEqual(revisionFor(updated, 'about'), current, `${changedId} is shared with the page`);
  }
});
