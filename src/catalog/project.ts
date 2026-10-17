import { imageUrl } from '../cms/images';
import { createDataAttribute } from 'next-sanity';
import { SANITY_STUDIO_BASE_PATH } from '../sanity/urls';
import legacyCatalogJson from './legacy-catalog.json';
import type {
  CatalogCategory,
  CatalogCategoryDocument,
  CatalogData,
  CatalogImage,
  CatalogImageWithRef,
  CatalogProduct,
  CatalogProductDocument,
  CatalogStyleCategory,
  CatalogStyleEntry,
  CatalogStyleDocument,
  LegacyCatalog,
} from './types';

const legacyCatalog = legacyCatalogJson as LegacyCatalog;
const DATA_ATTRIBUTE_BASE = {
  projectId: '5mntophk',
  dataset: 'production',
  baseUrl: SANITY_STUDIO_BASE_PATH,
} as const;

function legacyAssetUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.startsWith('assets/') ? `/${value}` : value;
}

const fallbackCategoryRows = legacyCatalog.categories.map(({ isActive: _isActive, showStyleReferences: _showStyles, ...category }) => ({
  ...category,
  ...(category.banner ? { banner: legacyAssetUrl(category.banner) } : {}),
}));

const fallbackProducts: CatalogProduct[] = legacyCatalog.products.map((product) => ({
  ...product,
  ...(product.image ? { image: legacyAssetUrl(product.image) } : {}),
  ...(product.hoverImage ? { hoverImage: legacyAssetUrl(product.hoverImage) } : {}),
  currentSizes: [...product.sizes],
  sizes: [...product.sizes],
  isActive: product.isActive !== false,
}));

function sortedUnique(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))];
}

function assertSafeHref(value: string | undefined): void {
  if (!value) return;
  const href = value.trim();
  if (!href || /[\u0000-\u0020\\]/.test(href) || href.startsWith('//') || href.startsWith('\\\\')) {
    throw new Error('Catalog links must use a safe site-relative or supported URL.');
  }
  const scheme = href.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && !['https', 'mailto', 'tel'].includes(scheme)) {
    throw new Error('Catalog links use an unsupported URL protocol.');
  }
}

function safeCssPosition(value: string | undefined): string {
  return typeof value === 'string' && /^(?:center|\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%)$/.test(value)
    ? value
    : 'center';
}

function safeCssSize(value: string | undefined): string {
  return typeof value === 'string' && /^(?:cover|contain|\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%)$/.test(value)
    ? value
    : 'cover';
}

function checkedAssetUrl(image: CatalogImage | null | undefined): string | undefined {
  const url = image?.asset?.url;
  if (!url) return undefined;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'cdn.sanity.io') {
    throw new Error('Catalog image URL is outside the trusted Sanity CDN.');
  }
  return url;
}

function projectImage(
  image: CatalogImage | null | undefined,
  dimensions: { width: number; height: number },
  preserveLegacyAsset: boolean,
): string | undefined {
  if (!image?.asset?._ref && !image?.asset?._id) return undefined;
  if (preserveLegacyAsset) return checkedAssetUrl(image);
  return imageUrl(image, dimensions);
}

function projectProducts(
  documents: CatalogProductDocument[],
  categories: Map<string, CatalogCategoryDocument>,
  preview: boolean,
): CatalogProduct[] {
  return documents
    .map((document, index) => {
      const categoryId = document.categoryId ?? '';
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document.productId)) {
        throw new Error('Catalog returned a product without a valid stable ID.');
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categoryId) || ['all', 'new'].includes(categoryId)) {
        throw new Error('Catalog returned a product without a valid category ID.');
      }
      if (!/^#[0-9a-fA-F]{6}$/.test(document.swatch ?? '')) {
        throw new Error('Catalog returned an invalid product colour swatch.');
      }
      const referencedCategory = categories.get(categoryId);
      const categoryActive = Boolean(referencedCategory && referencedCategory.active !== false);
      const currentSizes = sortedUnique(document.currentSizes ?? document.sourceSizes ?? []);
      const historicalSizes = sortedUnique(document.legacySizes ?? document.sourceSizes ?? []);
      const imageRef = (document.image as CatalogImageWithRef | null | undefined)?.assetRef;
      const hoverImageRef = (document.hoverImage as CatalogImageWithRef | null | undefined)?.assetRef;
      const imageIsLegacySource = Boolean(document.legacyImageAssetRef && imageRef === document.legacyImageAssetRef);
      const hoverIsLegacySource = Boolean(document.legacyHoverImageAssetRef && hoverImageRef === document.legacyHoverImageAssetRef);

      assertSafeHref(document.customizationHref);
      assertSafeHref(document.externalCustomizationHref);

      const product: CatalogProduct = {
        id: document.productId,
        name: document.name,
        category: categoryId,
        color: document.color ?? '',
        swatch: document.swatch ?? '#777777',
        currentSizes,
        sizes: sortedUnique([...historicalSizes, ...currentSizes]),
        isNew: document.isNew === true,
        isActive: document.active !== false && categoryActive,
        sortOrder: Number.isFinite(document.sortOrder) ? document.sortOrder! : index,
        description: document.description ?? '',
        ...(document.customizationHref ? { customizationHref: document.customizationHref } : {}),
        ...(document.externalCustomizationHref ? { externalCustomizationHref: document.externalCustomizationHref } : {}),
        ...(document.image ? { image: projectImage(document.image, { width: 1200, height: 1200 }, imageIsLegacySource) } : {}),
        ...(document.image?.alt || document.imageAlt ? { imageAlt: document.image?.alt || document.imageAlt } : {}),
        ...(document.image ? { imageSize: imageIsLegacySource ? safeCssSize(document.imageSize) : 'cover' } : {}),
        ...(document.image ? { position: imageIsLegacySource ? safeCssPosition(document.position) : 'center' } : {}),
        ...(document.hoverImage ? { hoverImage: projectImage(document.hoverImage, { width: 960, height: 960 }, hoverIsLegacySource) } : {}),
        ...(document.hoverImage?.alt || document.hoverImageAlt ? { hoverImageAlt: document.hoverImage?.alt || document.hoverImageAlt } : {}),
        ...(document.hoverImage ? { hoverImageSize: hoverIsLegacySource ? safeCssSize(document.hoverImageSize) : 'cover' } : {}),
        ...(document.hoverImage ? { hoverImagePosition: hoverIsLegacySource ? safeCssPosition(document.hoverImagePosition) : 'center' } : {}),
        ...(document.art ? { art: document.art } : {}),
      };
      if (preview && document._id) {
        const id = document._id.replace(/^drafts\./, '');
        product.editing = {
          name: createDataAttribute({ ...DATA_ATTRIBUTE_BASE, id, type: 'product', path: 'name' }).toString(),
          description: createDataAttribute({ ...DATA_ATTRIBUTE_BASE, id, type: 'product', path: 'description' }).toString(),
          image: createDataAttribute({ ...DATA_ATTRIBUTE_BASE, id, type: 'product', path: 'image' }).toString(),
          hoverImage: createDataAttribute({ ...DATA_ATTRIBUTE_BASE, id, type: 'product', path: 'hoverImage' }).toString(),
        };
      }
      return product;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function projectCategories(documents: CatalogCategoryDocument[], preview: boolean): CatalogCategory[] {
  return documents
    .filter((document) => document.active !== false)
    .map((document, index) => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document.categoryId)) {
        throw new Error('Catalog returned a category without a valid stable ID.');
      }
      const category: CatalogCategory = {
        id: document.categoryId,
        label: document.label,
        ...(document.styleLabel ? { styleLabel: document.styleLabel } : {}),
        sortOrder: Number.isFinite(document.sortOrder) ? document.sortOrder! : index,
        ...(document.banner ? {
          banner: projectImage(
            document.banner,
            { width: 1920, height: 780 },
            Boolean(
              document.legacyBannerAssetRef
              && (document.banner as CatalogImageWithRef).assetRef === document.legacyBannerAssetRef,
            ),
          ),
        } : {}),
        ...(document.banner?.alt || document.bannerAlt ? { bannerAlt: document.banner?.alt || document.bannerAlt || '' } : {}),
      };
      if (preview && document._id) {
        const id = document._id.replace(/^drafts\./, '');
        category.editing = {
          label: createDataAttribute({ ...DATA_ATTRIBUTE_BASE, id, type: 'productCategory', path: 'label' }).toString(),
          banner: createDataAttribute({ ...DATA_ATTRIBUTE_BASE, id, type: 'productCategory', path: 'banner' }).toString(),
        };
      }
      return category;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function projectStyles(
  documents: CatalogStyleDocument[],
  categories: CatalogCategoryDocument[],
  preview: boolean,
): CatalogStyleCategory[] {
  const activeCategories = new Map(categories
    .filter((category) => category.active !== false && category.showStyleReferences !== false)
    .map((category) => [category.categoryId, category]));
  const grouped = new Map<string, CatalogStyleCategory>();

  for (const category of activeCategories.values()) {
    const group: CatalogStyleCategory = {
      id: category.categoryId,
      label: category.styleLabel || category.label,
      sortOrder: Number.isFinite(category.sortOrder) ? category.sortOrder! : 0,
      entries: [],
    };
    if (preview && category._id) {
      const id = category._id.replace(/^drafts\./, '');
      group.editing = {
        label: createDataAttribute({
          ...DATA_ATTRIBUTE_BASE,
          id,
          type: 'productCategory',
          path: category.styleLabel ? 'styleLabel' : 'label',
        }).toString(),
      };
    }
    grouped.set(category.categoryId, group);
  }

  for (const document of documents) {
    if (document.active === false || !document.categoryId) continue;
    const category = activeCategories.get(document.categoryId);
    if (!category) continue;
    const group = grouped.get(category.categoryId) ?? {
      id: category.categoryId,
      label: category.styleLabel || category.label,
      sortOrder: Number.isFinite(category.sortOrder) ? category.sortOrder! : 0,
      entries: [],
    };
    const imageRef = (document.image as CatalogImageWithRef | null | undefined)?.assetRef;
    const imageIsLegacySource = Boolean(document.legacyImageAssetRef && imageRef === document.legacyImageAssetRef);
    assertSafeHref(document.href);
    const image = document.image ? projectImage(document.image, { width: 1200, height: 1200 }, imageIsLegacySource) : undefined;
    if (!image) continue;
    const entry: CatalogStyleEntry = {
      slug: document.styleId,
      name: document.name,
      href: document.href,
      image,
      position: safeCssPosition(imageIsLegacySource ? document.position : 'center'),
      size: safeCssSize(imageIsLegacySource ? document.size : 'cover'),
      alt: document.image?.alt ?? document.alt ?? document.name,
      sortOrder: Number.isFinite(document.sortOrder) ? document.sortOrder! : group.entries.length,
    };
    if (preview && document._id) {
      const id = document._id.replace(/^drafts\./, '');
      entry.editing = {
        name: createDataAttribute({ ...DATA_ATTRIBUTE_BASE, id, type: 'catalogStyle', path: 'name' }).toString(),
        image: createDataAttribute({ ...DATA_ATTRIBUTE_BASE, id, type: 'catalogStyle', path: 'image' }).toString(),
      };
    }
    group.entries.push(entry);
    grouped.set(category.categoryId, group);
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      entries: group.entries.sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug)),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function fallbackStyles(): CatalogStyleCategory[] {
  return legacyCatalog.styles.map((category) => ({
    id: category.id,
    label: category.label,
    sortOrder: category.sortOrder,
    entries: category.entries
      .filter((entry) => entry.isActive !== false)
      .map(({ isActive: _isActive, ...entry }) => ({ ...entry, image: legacyAssetUrl(entry.image) ?? entry.image })),
  }));
}

export function projectCatalogData(input: {
  products: CatalogProductDocument[];
  categories: CatalogCategoryDocument[];
  styles: CatalogStyleDocument[];
  preview?: boolean;
}): CatalogData {
  const useLegacyFallback = input.products.length === 0 && input.categories.length === 0 && input.styles.length === 0;
  const categories = input.categories.length
    ? input.categories
    : useLegacyFallback ? legacyCatalog.categories.map((category) => ({
      categoryId: category.id,
      label: category.label,
      styleLabel: category.styleLabel,
      sortOrder: category.sortOrder,
      active: category.isActive !== false,
      showStyleReferences: category.showStyleReferences,
    })) : [];
  const projectedCategories = input.categories.length
    ? projectCategories(categories, input.preview === true)
    : useLegacyFallback ? fallbackCategoryRows as CatalogCategory[] : [];
  const categoryById = new Map(categories.map((category) => [category.categoryId, category]));
  const products = input.products.length
    ? projectProducts(input.products, categoryById, input.preview === true)
    : useLegacyFallback ? fallbackProducts : [];
  const styles = input.styles.length
    ? projectStyles(input.styles, categories, input.preview === true)
    : useLegacyFallback ? fallbackStyles() : [];
  const filteredStyles = useLegacyFallback ? styles.filter((style) => {
      const category = categories.find((row) => row.categoryId === style.id);
      return category?.active !== false && category?.showStyleReferences !== false;
    }) : styles;
  const revisions = [
    ...input.categories,
    ...input.products,
    ...input.styles,
  ].map((document) => `${document._id ?? ''}:${document._rev ?? ''}`).sort();

  return {
    products,
    categories: projectedCategories,
    styles: filteredStyles,
    revision: revisions.length ? revisions.join('|') : 'legacy-catalog-v1',
  };
}
