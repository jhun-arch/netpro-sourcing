import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildSeedDocument,
  collectLegacyImagePaths,
  extractHomepageSeed,
} from '../src/cms/seedFromLegacy';
import { assertStableArrayIdentity } from '../src/cms/contracts';

async function readSource() {
  const [html, css] = await Promise.all([
    readFile('index.html', 'utf8'),
    readFile('home-studio.css', 'utf8'),
  ]);
  return { html, css };
}

test('legacy extraction captures homepage modules and keeps persistent array identities', async () => {
  const { html, css } = await readSource();
  const seed = extractHomepageSeed(html, css);

  assert.equal(seed._id, 'homePage');
  assert.equal(seed.hero.titleLines.length, 2);
  assert.equal(seed.collection.categories.length, 4);
  assert.equal(seed.process.steps.length, 3);
  assert.equal(seed.startingPoints.items.length, 2);
  assert.equal(seed.brandStory.gallery.length, 19);
  assert.equal(seed.benefits.items.length, 6);
  assert.equal(seed.faq.items.length, 6);
  assert.equal(seed.footer.columns.length, 4);
  assert.equal(collectLegacyImagePaths(seed).length, 27);

  assertStableArrayIdentity(seed.hero.slides, 'hero.slides');
  assertStableArrayIdentity(seed.collection.categories, 'collection.categories');
  assertStableArrayIdentity(seed.process.steps, 'process.steps');
  assertStableArrayIdentity(seed.startingPoints.items, 'startingPoints.items');
  assertStableArrayIdentity(seed.brandStory.gallery, 'brandStory.gallery');
  assertStableArrayIdentity(seed.benefits.items, 'benefits.items');
  assertStableArrayIdentity(seed.faq.items, 'faq.items');
  assertStableArrayIdentity(seed.footer.columns, 'footer.columns');
});

test('a layout-only class change does not regenerate imported content identities or text', async () => {
  const { html, css } = await readSource();
  const first = extractHomepageSeed(html, css);
  const layoutChanged = html.replace(
    'class="hero-photo hero-photo-coast is-active"',
    'class="hero-photo layout-review-only hero-photo-coast is-active"',
  );
  const second = extractHomepageSeed(layoutChanged, css);

  assert.deepEqual(second.hero, first.hero);
  assert.deepEqual(second.brandStory.gallery.map(({ _key, slug }) => ({ _key, slug })),
    first.brandStory.gallery.map(({ _key, slug }) => ({ _key, slug })));
  assert.deepEqual(second.faq.items.map(({ _key, slug }) => ({ _key, slug })),
    first.faq.items.map(({ _key, slug }) => ({ _key, slug })));
});

test('seed document resolves image references without changing stable row identity', async () => {
  const { html, css } = await readSource();
  const seed = extractHomepageSeed(html, css);
  const refs = Object.fromEntries(collectLegacyImagePaths(seed).map((path, index) => [path, `image-${index}`]));
  const document = buildSeedDocument(seed, refs);

  assert.equal(document._id, 'homePage');
  assert.equal(document.hero.slides[0]._key, seed.hero.slides[0]._key);
  assert.equal(document.hero.slides[0]._type, 'heroSlide');
  assert.equal(document.hero.slides[0].image.asset?._ref, refs[seed.hero.slides[0].image.path]);
  assert.equal(document.brandStory.gallery[0].slug, seed.brandStory.gallery[0].slug);
  assert.equal(document.brandStory.gallery[0]._type, 'galleryItem');
  assert.equal(document.benefits.intro.title, seed.benefits.intro.title);
  assert.equal(document.footer.columns[0]._type, 'footerColumn');
  assert.equal(document.footer.columns[0].links[0]._type, 'footerLink');
});
