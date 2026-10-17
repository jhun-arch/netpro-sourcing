import { collectSchemaPaths } from '../cms/contracts';
import { product } from '../sanity/schemaTypes/product';
import { productCategory } from '../sanity/schemaTypes/productCategory';
import { catalogStyle } from '../sanity/schemaTypes/catalogStyle';
import { catalogQueries } from './queries';

type SchemaNode = {
  name?: string;
  type?: string;
  fields?: readonly SchemaNode[];
  of?: readonly SchemaNode[];
};

export type CatalogContractInput = {
  productSchema?: SchemaNode;
  categorySchema?: SchemaNode;
  styleSchema?: SchemaNode;
  queries?: { product: string; category: string; style: string };
};

const schemaBindings = {
  product: [
    'productId', 'name', 'description', 'category', 'currentSizes', 'legacySizes', 'sourceSizes',
    'color', 'swatch', 'isNew', 'active', 'sortOrder', 'customizationHref', 'externalCustomizationHref',
    'image', 'image.alt', 'legacyImageAssetRef', 'imageAlt', 'imageSize', 'position',
    'hoverImage', 'hoverImage.alt', 'legacyHoverImageAssetRef', 'hoverImageAlt',
    'hoverImageSize', 'hoverImagePosition', 'art',
  ],
  category: [
    'categoryId', 'label', 'styleLabel', 'sortOrder', 'active', 'showStyleReferences',
    'banner', 'banner.alt', 'legacyBannerAssetRef', 'bannerAlt',
  ],
  style: [
    'styleId', 'name', 'category', 'href', 'image', 'image.alt', 'legacyImageAssetRef',
    'alt', 'position', 'size', 'sortOrder', 'active',
  ],
} as const;

const queryBindings = {
  product: [
    '_id', '_rev', 'productId', 'name', 'category->categoryId', 'currentSizes', 'legacySizes', 'sourceSizes',
    'color', 'swatch', 'isNew', 'active', 'sortOrder', 'description', 'customizationHref',
    'externalCustomizationHref', 'image', 'asset->{_id, url}', 'asset._ref', '"assetRef": asset._ref', 'legacyImageAssetRef', 'imageAlt', 'imageSize', 'position',
    'hoverImage', 'legacyHoverImageAssetRef', 'hoverImageAlt', 'hoverImageSize', 'hoverImagePosition', 'art',
  ],
  category: [
    '_id', '_rev', 'categoryId', 'label', 'styleLabel', 'sortOrder', 'active', 'showStyleReferences',
    'banner', 'asset->{_id, url}', 'asset._ref', '"assetRef": asset._ref', 'legacyBannerAssetRef', 'bannerAlt',
  ],
  style: [
    '_id', '_rev', 'styleId', 'name', 'category->categoryId', 'href', 'image',
    'asset->{_id, url}', 'asset._ref', '"assetRef": asset._ref', 'legacyImageAssetRef', 'position', 'size', 'alt', 'sortOrder', 'active',
  ],
} as const;

function includesQueryPath(query: string, path: string): boolean {
  if (path.includes('->')) return query.includes(path);
  const pattern = new RegExp(`(^|[^A-Za-z0-9_])${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_]|$)`);
  return pattern.test(query);
}

/** Checks every document field used by the catalog projections and GROQ aliases. */
export function checkCatalogContract(input: CatalogContractInput = {}): string[] {
  const schemas = {
    product: input.productSchema ?? product,
    category: input.categorySchema ?? productCategory,
    style: input.styleSchema ?? catalogStyle,
  };
  const queries = input.queries ?? catalogQueries;
  const errors: string[] = [];

  for (const kind of ['product', 'category', 'style'] as const) {
    const paths = collectSchemaPaths(schemas[kind]);
    for (const binding of schemaBindings[kind]) {
      if (!paths.has(binding)) errors.push(`${kind} projection reads field missing from schema: ${binding}`);
    }
    for (const binding of queryBindings[kind]) {
      if (!includesQueryPath(queries[kind], binding)) {
        errors.push(`${kind} query omits a required catalog field: ${binding}`);
      }
    }
    if (!queries[kind].trim().startsWith('*[_type ==')) {
      errors.push(`${kind} query must read the complete document type before projecting fields.`);
    }
  }

  return errors;
}
