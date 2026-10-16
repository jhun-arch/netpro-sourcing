import assert from 'node:assert/strict';
import test from 'node:test';
import { findMissingArrayItemTypes } from '../src/cms/arrayItemTypes';

function emptyHomeDocument() {
  return {
    hero: { slides: [{ _key: 'k-slide-1', _type: null as string | null }] },
    collection: { categories: [] },
    process: { steps: [] },
    startingPoints: { items: [] },
    brandStory: { galleryFilters: [], gallery: [] },
    benefits: { items: [] },
    faq: { items: [] },
    footer: {
      socialLinks: [],
      columns: [{ _key: 'k-column-1', _type: 'footerColumn', links: [{ _key: 'k-link-1' }] }],
    },
  };
}

test('array type repair plans use stable keyed paths and touch only missing _type fields', () => {
  const repairs = findMissingArrayItemTypes(emptyHomeDocument(), 'homePage');
  assert.deepEqual(repairs.map(({ patchPath, expectedType }) => ({ patchPath, expectedType })), [
    { patchPath: 'hero.slides[_key=="k-slide-1"]._type', expectedType: 'heroSlide' },
    { patchPath: 'footer.columns[_key=="k-column-1"].links[_key=="k-link-1"]._type', expectedType: 'footerLink' },
  ]);
});

test('array type repair rejects conflicting types and unsafe identities', () => {
  const wrongType = emptyHomeDocument();
  wrongType.hero.slides[0]._type = 'wrongType';
  assert.throws(() => findMissingArrayItemTypes(wrongType, 'homePage'), /unexpected _type/);

  const unsafeKey = emptyHomeDocument();
  unsafeKey.hero.slides[0]._key = 'unsafe"]|*[0]';
  assert.throws(() => findMissingArrayItemTypes(unsafeKey, 'homePage'), /safe, stable _key/);
});
