import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import legacyCatalogJson from '../src/catalog/legacy-catalog.json';
import { serializeCatalogJson } from '../src/catalog/CatalogBootstrap';
import { projectCatalogData } from '../src/catalog/project';
import { buildCatalogSeedDocuments, catalogSeedDocumentIds, collectCatalogImagePaths } from '../src/catalog/seed';
import { validateSizeHistory } from '../src/catalog/size-history-validation';
import type {
  CatalogCategoryDocument,
  CatalogImageWithRef,
  CatalogProductDocument,
  CatalogStyleDocument,
  LegacyCatalog,
} from '../src/catalog/types';

const catalog = legacyCatalogJson as LegacyCatalog;
const appSource = readFileSync(path.join(process.cwd(), 'app.js'), 'utf8');
const enquirySource = readFileSync(path.join(process.cwd(), 'enquiry-state.js'), 'utf8');
const shopHtml = readFileSync(path.join(process.cwd(), 'shop.html'), 'utf8');
const shopStylesSource = readFileSync(path.join(process.cwd(), 'shop-styles.js'), 'utf8');

function createShopDom(input: {
  url?: string;
  products: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  savedEnquiries?: unknown[];
}): { window: any; close: () => void } {
  const JSDOM = createRequire(import.meta.url)('jsdom').JSDOM as new (html: string, options: Record<string, unknown>) => { window: any };
  const dom = new JSDOM(shopHtml, {
    url: input.url ?? 'https://netpro.test/shop.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.performance.getEntriesByType = () => [];
  window.matchMedia = (media: string) => ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
  });
  window.HTMLDialogElement.prototype.showModal = function showModal(this: any) {
    this.open = true;
    this.setAttribute('open', '');
  };
  window.HTMLDialogElement.prototype.close = function close(this: any) {
    this.open = false;
    this.removeAttribute('open');
    this.dispatchEvent(new window.Event('close'));
  };
  if (input.savedEnquiries) {
    window.localStorage.setItem('netpro-b2b-enquiry', JSON.stringify(input.savedEnquiries));
  }
  window.NETPRO_PRODUCTS = input.products;
  window.NETPRO_CATEGORIES = input.categories;
  window.eval(enquirySource);
  window.eval(appSource);
  return { window, close: () => window.close() };
}

function image(assetRef: string, alt = 'Source product image'): CatalogImageWithRef {
  const assetId = /^image-[a-f0-9]{40}-\d+x\d+-[a-z0-9]+$/.test(assetRef)
    ? assetRef
    : `image-${'a'.repeat(40)}-400x400-webp`;
  return {
    _type: 'image',
    assetRef,
    asset: {
      _type: 'reference',
      _ref: assetId,
      _id: assetId,
      url: `https://cdn.sanity.io/images/5mntophk/production/${assetId.replace(/^image-/, '').replace(/-webp$/, '.webp')}`,
    },
    alt,
    crop: { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
    hotspot: { x: 0.5, y: 0.45, width: 0.7, height: 0.7 },
  };
}

function categoryDocument(overrides: Partial<CatalogCategoryDocument> = {}): CatalogCategoryDocument {
  return {
    _id: 'catalog-category-clothing',
    _rev: 'category-rev',
    categoryId: 'clothing',
    label: 'Clothing',
    styleLabel: 'Apparel',
    sortOrder: 0,
    active: true,
    showStyleReferences: true,
    ...overrides,
  };
}

function productDocument(overrides: Partial<CatalogProductDocument> = {}): CatalogProductDocument {
  return {
    _id: 'catalog-product-tee-white',
    _rev: 'product-rev',
    productId: 'tee-white',
    name: 'Essential White Tee',
    categoryId: 'clothing',
    color: 'White',
    swatch: '#f0f0eb',
    currentSizes: ['M', 'L'],
    legacySizes: ['S', 'M', 'L', 'XL'],
    sourceSizes: ['S', 'M', 'L', 'XL'],
    isNew: false,
    active: true,
    sortOrder: 0,
    description: 'A product for bulk sourcing.',
    ...overrides,
  };
}

function createEnquiryState(saved: unknown[]) {
  const storage = new Map([['netpro-b2b-enquiry', JSON.stringify(saved)]]);
  const window = {
    localStorage: {
      getItem(key: string) { return storage.get(key) ?? null; },
      setItem(key: string, value: string) { storage.set(key, value); },
    },
    dispatchEvent() {},
  };
  vm.runInNewContext(enquirySource, { window, Event, JSON, Number, Map, Set, Object, Array, String });
  return window as typeof window & { NetproEnquiryState: { load(products: unknown[]): unknown[] } };
}

test('the import fixture contains all source products, five categories and 23 style cards', () => {
  assert.equal(catalog.products.length, 31);
  assert.equal(catalog.categories.length, 5);
  assert.equal(catalog.styles.reduce((count, category) => count + category.entries.length, 0), 23);
  assert.deepEqual(Object.fromEntries(catalog.categories.map((category) => [
    category.id,
    catalog.products.filter((product) => product.category === category.id).length,
  ])), { clothing: 6, socks: 9, headwear: 9, bags: 2, patches: 5 });
  assert.equal(catalog.products.filter((product) => product.art && !product.image).length, 9);
  assert.equal(collectCatalogImagePaths(catalog).length, 41);
  assert.equal(catalog.products.find((product) => product.id === 'tee-white')?.id, 'tee-white');
  assert.ok(!catalog.products.some((product) => product.id === 'TEE-WHITE'));
});

test('seed documents preserve source identities, old sizes, category relations and image references', () => {
  const paths = collectCatalogImagePaths(catalog);
  const refs = Object.fromEntries(paths.map((source, index) => [source, `image-${String(index + 1).padStart(40, 'a')}-1x1-webp`])) as Record<string, string>;
  const documents = buildCatalogSeedDocuments(catalog, refs);
  assert.equal(documents.length, 59);
  assert.equal(new Set(catalogSeedDocumentIds(catalog)).size, 59);

  const whiteTee = documents.find((document) => document._id === 'catalog-product-tee-white');
  assert.equal(whiteTee?.productId, 'tee-white');
  assert.deepEqual(whiteTee?.currentSizes, ['S', 'M', 'L', 'XL']);
  assert.deepEqual(whiteTee?.legacySizes, ['S', 'M', 'L', 'XL']);
  assert.deepEqual(whiteTee?.sourceSizes, ['S', 'M', 'L', 'XL']);
  assert.deepEqual(whiteTee?.category, { _type: 'reference', _ref: 'catalog-category-clothing' });
  assert.equal(whiteTee?.legacyHoverImageAssetRef, refs['assets/shop-onbody-tee-white-v1.webp']);
  assert.ok(documents.some((document) => document._id === 'catalog-style-custom-t-shirts'));
  assert.ok(documents.some((document) => document._id === 'catalog-category-patches'));
});

test('partial seed skips existing published or draft identities and their source files', () => {
  const existing = ['catalog-product-tee-white', 'drafts.catalog-style-custom-t-shirts'];
  const paths = collectCatalogImagePaths(catalog, existing);
  const tee = catalog.products.find((product) => product.id === 'tee-white');
  assert.ok(tee?.hoverImage);
  assert.ok(!paths.includes(tee.hoverImage.split('?')[0]));

  const refs = Object.fromEntries(collectCatalogImagePaths(catalog).map((source, index) => [
    source,
    `image-${String(index + 1).padStart(40, 'b')}-1x1-webp`,
  ])) as Record<string, string>;
  const documents = buildCatalogSeedDocuments(catalog, refs, existing);
  assert.equal(documents.length, 57);
  assert.ok(!documents.some((document) => document._id === 'catalog-product-tee-white'));
  assert.ok(!documents.some((document) => document._id === 'catalog-style-custom-t-shirts'));
});

test('archived products keep historical enquiry sizes while current choices stay narrowed', () => {
  const projected = projectCatalogData({
    products: [productDocument({ active: false, currentSizes: ['M', 'L'], legacySizes: ['S', 'M', 'L', 'XL'] })],
    categories: [categoryDocument()],
    styles: [],
  });
  const product = projected.products[0];
  assert.equal(product.id, 'tee-white');
  assert.equal(product.isActive, false);
  assert.deepEqual(product.currentSizes, ['M', 'L']);
  assert.deepEqual(product.sizes, ['S', 'M', 'L', 'XL']);

  const window = createEnquiryState([{ id: 'tee-white', size: 'XL', quantity: 2 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(window.NetproEnquiryState.load(projected.products))), [{
    id: 'tee-white', size: 'XL', quantity: 2, intent: 'stock', customization: [], notes: '',
  }]);

  assert.match(appSource, /const activeProducts = products\.filter\(product => product && product\.isActive !== false\)/);
  assert.match(appSource, /currentSizesFor\(p\)\.includes\(size\)/);
  assert.match(appSource, /const values = intent === 'custom' \? \[\.\.\.currentSizes, 'To be confirmed'\] : currentSizes/);
});

test('the shop DOM sorts CMS categories, adds current filters, matches root-relative custom links, and keeps archived enquiries', () => {
  const dom = createShopDom({
    url: 'https://netpro.test/shop.html?category=outerwear&style=custom-t-shirts',
    categories: [
      { id: 'clothing', label: 'Apparel', sortOrder: 10 },
      { id: 'headwear', label: 'Headwear', sortOrder: 20 },
      { id: 'outerwear', label: 'Outerwear', sortOrder: 1 },
    ],
    products: [
      {
        id: 'teal-cap', name: 'Teal Custom Cap', category: 'outerwear', color: 'Teal', swatch: '#008080',
        currentSizes: ['XXL'], sizes: ['XL', 'XXL'], customizationHref: '/custom-t-shirts.html', isActive: true,
        sortOrder: 0, description: 'Teal cap',
      },
      {
        id: 'cream-cap', name: 'Cream Custom Cap', category: 'outerwear', color: 'Cream', swatch: '#f0e8d8',
        currentSizes: ['XL'], sizes: ['L', 'XL'], customizationHref: './custom-t-shirts.html', isActive: true,
        sortOrder: 1, description: 'Cream cap',
      },
      {
        id: 'blue-cap', name: 'Blue Custom Cap', category: 'outerwear', color: 'Blue', swatch: '#3355aa',
        currentSizes: ['One size'], sizes: ['One size'], customizationHref: 'custom-baseball-caps.html', isActive: true,
        sortOrder: 2, description: 'Blue cap',
      },
      {
        id: 'archived-cap', name: 'Archived Purple Cap', category: 'outerwear', color: 'Purple', swatch: '#800080',
        currentSizes: ['S'], sizes: ['S', 'XL'], customizationHref: 'custom-t-shirts.html', isActive: false,
        sortOrder: 3, description: 'Archived cap',
      },
      {
        id: 'old-tee', name: 'Archived Essential Tee', category: 'clothing', color: 'White', swatch: '#f0f0eb',
        currentSizes: ['M', 'L'], sizes: ['S', 'M', 'L', 'XL'], art: 'catalog-0', isActive: false,
        sortOrder: 4, description: 'Archived tee',
      },
    ],
    savedEnquiries: [{ id: 'old-tee', size: 'XL', quantity: 2 }],
  });

  try {
    const { window } = dom;
    const document = window.document;
    const categoryValues = [...document.querySelector('#category-select').options].map((option: any) => option.value);
    assert.deepEqual(categoryValues, ['all', 'outerwear', 'clothing', 'headwear']);
    const radioValues = [...document.querySelectorAll('#category-options input[name="category"]')]
      .map((input: any) => input.value);
    assert.deepEqual(radioValues, ['all', 'outerwear', 'clothing', 'headwear']);

    const colorSelect = document.querySelector('[data-shop-filter="color"]');
    assert.ok([...colorSelect.options].some((option: any) => option.value === 'Teal'));
    assert.ok(![...colorSelect.options].some((option: any) => option.value === 'Purple'));
    const xxl = document.querySelector('[data-size="XXL"]');
    assert.ok(xxl, 'the CMS-only current size is present before event handlers run');
    assert.deepEqual([...document.querySelectorAll('.product-card')].map((card: any) => card.dataset.product), ['teal-cap', 'cream-cap']);
    assert.ok(!document.querySelector('[data-product="blue-cap"]'), 'the style query excludes another custom page');
    assert.ok(!document.querySelector('[data-product="archived-cap"]'));
    assert.ok(!document.querySelector('[data-product="old-tee"]'));

    colorSelect.value = 'Teal';
    colorSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.deepEqual([...document.querySelectorAll('.product-card')].map((card: any) => card.dataset.product), ['teal-cap']);
    xxl.click();
    assert.equal(xxl.getAttribute('aria-pressed'), 'true');
    assert.deepEqual([...document.querySelectorAll('.product-card')].map((card: any) => card.dataset.product), ['teal-cap']);

    const search = document.querySelector('#search-input');
    search.value = 'Archived Essential Tee';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.ok(document.querySelector('#search-results .search-empty'), 'archived products stay out of public search');

    document.querySelector('[data-open="bag"]').click();
    const bagText = document.querySelector('#bag-items').textContent;
    assert.match(bagText, /Archived Essential Tee/);
    assert.match(bagText, /White · XL/);
    assert.equal(document.querySelector('#bag-total-count').textContent, '2');
    assert.deepEqual(JSON.parse(window.localStorage.getItem('netpro-b2b-enquiry')), [
      { id: 'old-tee', size: 'XL', quantity: 2 },
    ]);
  } finally {
    dom.close();
  }
});

test('new patches add with a supported size while legacy patches keep their default and missing style links stay absent', () => {
  const newPatch = {
    id: 'new-patch', name: 'New Embroidered Patch', category: 'patches', color: 'Navy', swatch: '#1b2d4b',
    currentSizes: ['One size'], sizes: ['One size'], isActive: true, description: 'A new patch design',
  };
  const oldPatches = catalog.products.filter((product) => product.category === 'patches');
  assert.equal(oldPatches.length, 5);

  const newPatchDom = createShopDom({
    url: 'https://netpro.test/shop.html?category=patches',
    categories: [{ id: 'patches', label: 'Ready-Made Patches', sortOrder: 0 }],
    products: [newPatch],
  });
  try {
    const { window } = newPatchDom;
    const document = window.document;
    document.querySelector('[data-detail="new-patch"]').click();
    assert.equal(document.querySelector('#product-dialog').open, true);
    assert.equal(document.querySelector('#detail-styles-link'), null, 'no style CTA is rendered without a destination');
    document.querySelector('#add-to-bag').click();
    assert.deepEqual(JSON.parse(window.localStorage.getItem('netpro-b2b-enquiry')), [{
      id: 'new-patch', size: 'One size', quantity: 1, intent: 'stock', customization: [], notes: '',
    }]);
  } finally {
    newPatchDom.close();
  }

  for (const oldPatch of oldPatches) {
    const oldPatchDom = createShopDom({
      url: 'https://netpro.test/shop.html?category=patches',
      categories: [{ id: 'patches', label: 'Ready-Made Patches', sortOrder: 0 }],
      products: [oldPatch as unknown as Record<string, unknown>],
    });
    try {
      const { window } = oldPatchDom;
      const document = window.document;
      document.querySelector(`[data-detail="${oldPatch.id}"]`).click();
      const stylesLink = document.querySelector('#detail-styles-link');
      assert.ok(stylesLink);
      assert.equal(stylesLink.getAttribute('href'), oldPatch.externalCustomizationHref || oldPatch.customizationHref);
      document.querySelector('#add-to-bag').click();
      assert.deepEqual(JSON.parse(window.localStorage.getItem('netpro-b2b-enquiry')), [{
        id: oldPatch.id, size: 'Not specified', quantity: 1, intent: 'stock', customization: [], notes: '',
      }]);
    } finally {
      oldPatchDom.close();
    }
  }

  const noLinkProductDom = createShopDom({
    url: 'https://netpro.test/shop.html?category=outerwear',
    categories: [{ id: 'outerwear', label: 'Outerwear', sortOrder: 0 }],
    products: [{
      id: 'new-jacket', name: 'New Jacket', category: 'outerwear', color: 'Blue', swatch: '#3355aa',
      currentSizes: ['M'], sizes: ['M'], isActive: true, description: 'A new jacket design',
    }],
  });
  try {
    const document = noLinkProductDom.window.document;
    document.querySelector('[data-detail="new-jacket"]').click();
    document.querySelector('[name="detail-request-intent"][value="custom"]').click();
    assert.equal(document.querySelector('#detail-request-badge').textContent, 'CUSTOM REQUEST');
    assert.equal(document.querySelector('#detail-styles-link'), null, 'changing intent tolerates a missing optional destination');
  } finally {
    noLinkProductDom.close();
  }
});

test('preview product art remains an editable image target with stable Studio identity and field path', () => {
  const projected = projectCatalogData({
    products: [productDocument({ art: 'catalog-0', image: null })],
    categories: [categoryDocument()],
    styles: [],
    preview: true,
  }).products[0];
  const dom = createShopDom({
    url: 'https://netpro.test/shop.html?category=clothing',
    categories: [{ id: 'clothing', label: 'Clothing', sortOrder: 0 }],
    products: [projected as unknown as Record<string, unknown>],
  });

  try {
    const productButton = dom.window.document.querySelector('[data-detail="tee-white"]');
    const artImage = productButton.querySelector('.product-art[data-sanity]');
    assert.ok(artImage, 'the art-only product still exposes the image editor target');
    assert.match(artImage.getAttribute('data-sanity'), /id=catalog-product-tee-white/);
    assert.match(artImage.getAttribute('data-sanity'), /path=image/);
    assert.match(artImage.getAttribute('data-sanity'), /base=%2Fstudio/);
    assert.equal(productButton.hasAttribute('data-sanity'), false, 'the product click target does not replace the image binding');
  } finally {
    dom.close();
  }
});

test('preview style imagery keeps the original parent link and a stable image binding', () => {
  const styleImage = image(`image-${'f'.repeat(40)}-800x800-webp`, 'Style image alt');
  const projected = projectCatalogData({
    products: [],
    categories: [categoryDocument()],
    styles: [{
      _id: 'drafts.catalog-style-custom-t-shirts',
      styleId: 'custom-t-shirts',
      name: 'T-Shirt Styles',
      categoryId: 'clothing',
      href: 'custom-t-shirts.html',
      image: styleImage,
      legacyImageAssetRef: 'image-old-style',
      position: '50% 0%',
      size: '300% 200%',
      alt: 'Legacy image alt',
      sortOrder: 0,
      active: true,
    }],
    preview: true,
  });
  const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: new (html: string, options: Record<string, unknown>) => { window: any } };
  const dom = new JSDOM(
    '<section id="shop-style-section"><div role="tablist"></div><div role="tabpanel" id="shop-style-panel"><ul class="shop-style-card-grid"></ul></div><p class="shop-style-status"></p></section>',
    { url: 'https://netpro.test/shop.html', runScripts: 'outside-only' },
  );
  const { window } = dom;
  window.CSS = { escape: (value: string) => value };
  window.NETPRO_CATALOG_STYLES = { categories: projected.styles };
  window.eval(shopStylesSource);

  try {
    const link = window.document.querySelector('.shop-style-card-link');
    const imageTarget = link.querySelector('.shop-style-image');
    assert.equal(link.getAttribute('href'), 'custom-t-shirts.html');
    assert.equal(imageTarget.getAttribute('data-sanity'), projected.styles[0].entries[0].editing?.image);
    assert.match(imageTarget.getAttribute('data-sanity'), /id=catalog-style-custom-t-shirts/);
    assert.match(imageTarget.getAttribute('data-sanity'), /path=image/);
    assert.match(imageTarget.getAttribute('data-sanity'), /base=%2Fstudio/);
    assert.equal(imageTarget.getAttribute('aria-label'), 'Style image alt');
  } finally {
    dom.window.close();
  }
});

test('new category, color and size values pass through the catalog filters', () => {
  const projected = projectCatalogData({
    products: [productDocument({
      _id: 'catalog-product-new-cap',
      productId: 'new-cap',
      categoryId: 'custom-headwear',
      color: 'Teal',
      swatch: '#008080',
      currentSizes: ['XXL'],
      legacySizes: ['M', 'XXL'],
      sourceSizes: [],
    })],
    categories: [categoryDocument({
      _id: 'catalog-category-custom-headwear',
      categoryId: 'custom-headwear',
      label: 'Custom Headwear',
      styleLabel: '帽子款式',
      sortOrder: 9,
      banner: image('image-banner-asset', 'Banner alt'),
    })],
    styles: [],
  });
  const product = projected.products[0];
  assert.equal(projected.categories[0].id, 'custom-headwear');
  assert.equal(product.category, 'custom-headwear');
  assert.equal(product.isActive, true);
  assert.deepEqual(product.currentSizes, ['XXL']);
  assert.deepEqual([...new Set(projected.products.filter((item) => item.isActive).map((item) => item.color))], ['Teal']);
  assert.deepEqual([...new Set(projected.products.filter((item) => item.isActive).flatMap((item) => item.currentSizes))], ['XXL']);
  assert.match(appSource, /window\.NETPRO_CATEGORIES/);
  assert.match(appSource, /ensureCatalogFilterOptions/);
  assert.match(appSource, /currentSizesFor/);
});

test('unchanged product and category assets retain the original URL and CSS crop settings', () => {
  const originalUrl = `https://cdn.sanity.io/images/5mntophk/production/${'b'.repeat(40)}-800x800.webp`;
  const originalRef = 'image-original-asset';
  const original = image(originalRef);
  original.asset!.url = originalUrl;
  const originalHover = image(originalRef, 'Original hover image alt');
  originalHover.asset!.url = originalUrl;
  const originalStyle = image(originalRef, 'Original style image alt');
  originalStyle.asset!.url = originalUrl;
  const projected = projectCatalogData({
    products: [productDocument({
      image: original,
      legacyImageAssetRef: originalRef,
      imageSize: '300% 200%',
      position: '50% 0%',
      hoverImage: originalHover,
      legacyHoverImageAssetRef: originalRef,
      hoverImageSize: '200% 300%',
      hoverImagePosition: '0% 50%',
    })],
    categories: [categoryDocument({
      banner: Object.assign(image(originalRef, 'Original banner'), {
        asset: { ...image(originalRef).asset!, url: originalUrl },
      }),
      legacyBannerAssetRef: originalRef,
    })],
    styles: [{
      styleId: 'legacy-style', name: 'Legacy style', categoryId: 'clothing', href: 'custom-t-shirts.html',
      image: originalStyle, legacyImageAssetRef: originalRef, position: '50% 0%', size: '300% 200%',
    }],
  });
  assert.equal(projected.products[0].image, originalUrl);
  assert.equal(projected.products[0].imageSize, '300% 200%');
  assert.equal(projected.products[0].position, '50% 0%');
  assert.equal(projected.products[0].hoverImage, originalUrl);
  assert.equal(projected.products[0].hoverImageSize, '200% 300%');
  assert.equal(projected.products[0].hoverImagePosition, '0% 50%');
  assert.equal(projected.categories[0].banner, originalUrl);
  assert.equal(projected.styles[0].entries[0].image, originalUrl);
  assert.equal(projected.styles[0].entries[0].position, '50% 0%');
  assert.equal(projected.styles[0].entries[0].size, '300% 200%');
});

test('replacement image uses Sanity crop and hotspot and resets legacy sprite styling', () => {
  const newImage = image(`image-${'c'.repeat(40)}-640x640-webp`, 'Replacement image');
  const newHoverImage = image(`image-${'9'.repeat(40)}-640x640-webp`, 'Replacement hover image');
  const newBanner = image(`image-${'d'.repeat(40)}-1800x900-webp`, 'Replacement banner');
  const newStyleImage = image(`image-${'8'.repeat(40)}-1200x1200-webp`, 'Replacement style image');
  const projected = projectCatalogData({
    products: [productDocument({
      image: newImage,
      legacyImageAssetRef: 'image-original-asset',
      imageAlt: 'Legacy product fallback alt',
      imageSize: '300% 200%',
      position: '50% 0%',
      hoverImage: newHoverImage,
      legacyHoverImageAssetRef: 'image-original-hover',
      hoverImageAlt: 'Legacy hover fallback alt',
      hoverImageSize: '200% 300%',
      hoverImagePosition: '0% 50%',
    })],
    categories: [categoryDocument({
      banner: newBanner, legacyBannerAssetRef: 'image-original-banner', bannerAlt: 'Legacy banner fallback alt',
    })],
    styles: [{
      styleId: 'replacement-style', name: 'Replacement style', categoryId: 'clothing', href: 'custom-t-shirts.html',
      image: newStyleImage, legacyImageAssetRef: 'image-original-style', position: '50% 0%', size: '300% 200%',
      alt: 'Legacy style fallback alt',
    }],
  });
  assert.match(projected.products[0].image ?? '', /^https:\/\/cdn\.sanity\.io\/images\/5mntophk\/production\//);
  assert.match(projected.products[0].image ?? '', /w=1200/);
  assert.equal(projected.products[0].imageAlt, 'Replacement image');
  assert.equal(projected.products[0].imageSize, 'cover');
  assert.equal(projected.products[0].position, 'center');
  assert.match(projected.products[0].hoverImage ?? '', /w=960/);
  assert.equal(projected.products[0].hoverImageAlt, 'Replacement hover image');
  assert.equal(projected.products[0].hoverImageSize, 'cover');
  assert.equal(projected.products[0].hoverImagePosition, 'center');
  assert.match(projected.categories[0].banner ?? '', /w=1920/);
  assert.equal(projected.categories[0].bannerAlt, 'Replacement banner');
  assert.match(projected.styles[0].entries[0].image ?? '', /w=1200/);
  assert.equal(projected.styles[0].entries[0].alt, 'Replacement style image');
  assert.equal(projected.styles[0].entries[0].position, 'center');
  assert.equal(projected.styles[0].entries[0].size, 'cover');
});

test('projector rejects unsafe links even if a document bypassed Studio validation', () => {
  assert.throws(() => projectCatalogData({
    products: [productDocument({ customizationHref: 'javascript:alert(1)' })],
    categories: [categoryDocument()],
    styles: [],
  }), /unsupported URL protocol/);

  const style: CatalogStyleDocument = {
    styleId: 'dangerous-card', name: 'Dangerous card', categoryId: 'clothing',
    href: 'data:text/html,<script>alert(1)</script>', image: image(`image-${'e'.repeat(40)}-100x100-webp`),
  };
  assert.throws(() => projectCatalogData({ products: [], categories: [categoryDocument()], styles: [style] }), /unsupported URL protocol/);
});

test('preview editing attributes keep stable document identity and field paths', () => {
  const projected = projectCatalogData({
    products: [productDocument({ _id: 'drafts.catalog-product-tee-white', image: null })],
    categories: [categoryDocument({ _id: 'drafts.catalog-category-clothing', banner: null })],
    styles: [],
    preview: true,
  });
  assert.match(projected.products[0].editing?.image ?? '', /catalog-product-tee-white/);
  assert.match(projected.products[0].editing?.image ?? '', /image/);
  assert.match(projected.products[0].editing?.name ?? '', /name/);
  assert.match(projected.categories[0].editing?.banner ?? '', /catalog-category-clothing/);
  assert.match(projected.categories[0].editing?.banner ?? '', /banner/);

  const publicData = projectCatalogData({
    products: [productDocument()], categories: [categoryDocument()], styles: [], preview: false,
  });
  assert.equal(publicData.products[0].editing, undefined);
  assert.equal(publicData.categories[0].editing, undefined);
});

test('bootstrap JSON escapes HTML-breaking characters and Unicode line separators', () => {
  const serialized = serializeCatalogJson({ value: '</script>\u2028\u2029' });
  assert.ok(!serialized.includes('</script>'));
  assert.ok(!serialized.includes('\u2028'));
  assert.ok(!serialized.includes('\u2029'));
  assert.match(serialized, /\\u003c\/script>/);
  assert.match(serialized, /\\u2028/);
  assert.match(serialized, /\\u2029/);
});

test('historical size validation preserves imported, current and previously published choices', () => {
  assert.equal(validateSizeHistory({
    value: ['S', 'M', 'L'], sourceSizes: ['S', 'M'], currentSizes: ['L'], publishedSizes: ['XS'],
  }), '不能移除当前或曾发布过的尺码；如新增当前尺码，请先追加历史尺码：XS');
  assert.equal(validateSizeHistory({
    value: ['S', 'M', 'L', 'XS'], sourceSizes: ['S', 'M'], currentSizes: ['L'], publishedSizes: ['XS'],
  }), true);
});
