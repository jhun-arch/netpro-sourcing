import type { LegacyCatalog } from './types';

export type CatalogSeedDocument = {
  _id: string;
  _type: 'product' | 'productCategory' | 'catalogStyle';
  [field: string]: unknown;
};

export type CatalogAssetRefs = Record<string, string>;

export function catalogSeedDocumentIds(data: LegacyCatalog): string[] {
  return [
    ...data.categories.map((category) => `catalog-category-${category.id}`),
    ...data.products.map((product) => `catalog-product-${product.id}`),
    ...data.styles.flatMap((category) => category.entries.map((entry) => `catalog-style-${entry.slug}`)),
  ];
}

function alreadyExists(existingIds: Set<string>, id: string): boolean {
  return existingIds.has(id) || existingIds.has(`drafts.${id}`);
}

function localAssetPath(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const sourcePath = value.split('?')[0];
  if (!/^assets\/[A-Za-z0-9._/-]+$/.test(sourcePath) || sourcePath.split('/').includes('..')) {
    throw new Error('Catalog import contains an unsupported local image path.');
  }
  return sourcePath;
}

export function collectCatalogImagePaths(data: LegacyCatalog, existingDocumentIds: Iterable<string> = []): string[] {
  const existing = new Set(existingDocumentIds);
  const paths = [
    ...data.categories.filter((category) => !alreadyExists(existing, `catalog-category-${category.id}`)).map((category) => localAssetPath(category.banner)),
    ...data.products.filter((product) => !alreadyExists(existing, `catalog-product-${product.id}`)).flatMap((product) => [localAssetPath(product.image), localAssetPath(product.hoverImage)]),
    ...data.styles.flatMap((category) => category.entries
      .filter((entry) => !alreadyExists(existing, `catalog-style-${entry.slug}`))
      .map((entry) => localAssetPath(entry.image))),
  ];
  return [...new Set(paths.filter((value): value is string => Boolean(value)))].sort();
}

function imageValue(
  sourcePath: string | undefined,
  alt: string | undefined,
  refs: CatalogAssetRefs,
): { _type: 'image'; asset: { _type: 'reference'; _ref: string }; alt?: string } | undefined {
  const path = localAssetPath(sourcePath);
  if (!path) return undefined;
  const assetId = refs[path];
  if (!assetId) throw new Error(`Missing uploaded image reference for ${path}.`);
  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: assetId },
    ...(alt ? { alt } : {}),
  };
}

export function buildCatalogSeedDocuments(
  data: LegacyCatalog,
  refs: CatalogAssetRefs,
  existingDocumentIds: Iterable<string> = [],
): CatalogSeedDocument[] {
  const documents: CatalogSeedDocument[] = [];
  const categoryIds = new Set(data.categories.map((category) => category.id));
  const existing = new Set(existingDocumentIds);

  for (const category of data.categories) {
    const documentId = `catalog-category-${category.id}`;
    if (alreadyExists(existing, documentId)) continue;
    const banner = imageValue(category.banner, category.bannerAlt, refs);
    documents.push({
      _id: documentId,
      _type: 'productCategory',
      categoryId: category.id,
      label: category.label,
      styleLabel: category.styleLabel ?? category.label,
      sortOrder: category.sortOrder,
      active: category.isActive !== false,
      showStyleReferences: category.showStyleReferences === true,
      ...(banner ? {
        banner,
        legacyBannerAssetRef: refs[localAssetPath(category.banner)!],
        bannerAlt: category.bannerAlt ?? '',
      } : {}),
    });
  }

  for (const product of data.products) {
    const documentId = `catalog-product-${product.id}`;
    if (alreadyExists(existing, documentId)) continue;
    if (!categoryIds.has(product.category)) throw new Error(`Product ${product.id} has no matching category.`);
    const image = imageValue(product.image, product.imageAlt, refs);
    const hoverImage = imageValue(product.hoverImage, product.hoverImageAlt, refs);
    documents.push({
      _id: documentId,
      _type: 'product',
      productId: product.id,
      name: product.name,
      description: product.description,
      category: { _type: 'reference', _ref: `catalog-category-${product.category}` },
      color: product.color,
      swatch: product.swatch,
      currentSizes: [...product.sizes],
      legacySizes: [...product.sizes],
      sourceSizes: [...product.sizes],
      isNew: product.isNew,
      active: product.isActive !== false,
      sortOrder: product.sortOrder,
      ...(product.customizationHref ? { customizationHref: product.customizationHref } : {}),
      ...(product.externalCustomizationHref ? { externalCustomizationHref: product.externalCustomizationHref } : {}),
      ...(image ? {
        image,
        legacyImageAssetRef: refs[localAssetPath(product.image)!],
        imageAlt: product.imageAlt ?? '',
        imageSize: product.imageSize ?? 'cover',
        position: product.position ?? 'center',
      } : {}),
      ...(hoverImage ? {
        hoverImage,
        legacyHoverImageAssetRef: refs[localAssetPath(product.hoverImage)!],
        hoverImageAlt: product.hoverImageAlt ?? '',
        hoverImageSize: product.hoverImageSize ?? 'cover',
        hoverImagePosition: product.hoverImagePosition ?? 'center',
      } : {}),
      ...(product.art ? { art: product.art } : {}),
    });
  }

  for (const category of data.styles) {
    if (!categoryIds.has(category.id)) throw new Error(`Style group ${category.id} has no matching category.`);
    for (const entry of category.entries) {
      const documentId = `catalog-style-${entry.slug}`;
      if (alreadyExists(existing, documentId)) continue;
      const image = imageValue(entry.image, entry.alt, refs);
      if (!image) throw new Error(`Style card ${entry.slug} is missing its image.`);
      documents.push({
        _id: documentId,
        _type: 'catalogStyle',
        styleId: entry.slug,
        name: entry.name,
        category: { _type: 'reference', _ref: `catalog-category-${category.id}` },
        href: entry.href,
        image,
        legacyImageAssetRef: refs[localAssetPath(entry.image)!],
        alt: entry.alt,
        position: entry.position,
        size: entry.size,
        sortOrder: entry.sortOrder,
        active: true,
      });
    }
  }

  const ids = documents.map((document) => document._id);
  if (new Set(ids).size !== ids.length) throw new Error('Catalog seed contains duplicate stable document IDs.');
  return documents;
}
