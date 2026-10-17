import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogQueries } from '../src/catalog/queries';
import { checkCatalogContract } from '../src/catalog/contracts';
import { catalogStyle } from '../src/sanity/schemaTypes/catalogStyle';
import { product } from '../src/sanity/schemaTypes/product';
import { productCategory } from '../src/sanity/schemaTypes/productCategory';

type SchemaNode = {
  name?: string;
  type?: string;
  hidden?: boolean;
  readOnly?: boolean;
  initialValue?: unknown;
  fields?: SchemaNode[];
  of?: SchemaNode[];
};

function cloneSchema(node: SchemaNode): SchemaNode {
  return {
    ...node,
    ...(node.fields ? { fields: node.fields.map(cloneSchema) } : {}),
    ...(node.of ? { of: node.of.map(cloneSchema) } : {}),
  };
}

test('catalog projections and GROQ queries cover product, category, style, and image fields', () => {
  assert.deepEqual(checkCatalogContract(), []);
  assert.match(catalogQueries.product, /currentSizes, legacySizes, sourceSizes/);
  assert.match(catalogQueries.category, /banner\s*\{[\s\S]*assetRef/);
  assert.match(catalogQueries.style, /category->categoryId/);
});

test('new catalog identities are generated and technical fields stay out of the editor flow', () => {
  const field = (schema: SchemaNode, name: string) => schema.fields?.find((entry) => entry.name === name);
  for (const [schema, idField] of [[productCategory, 'categoryId'], [catalogStyle, 'styleId']] as const) {
    const id = field(schema as unknown as SchemaNode, idField);
    assert.equal(typeof id?.initialValue, 'function');
    assert.equal(id?.hidden, true);
    assert.equal(id?.readOnly, true);
  }

  assert.deepEqual(field(product as unknown as SchemaNode, 'currentSizes')?.initialValue, ['One size']);
  assert.deepEqual(field(product as unknown as SchemaNode, 'legacySizes')?.initialValue, ['One size']);
  for (const [schema, fields] of [
    [product, ['legacyImageAssetRef', 'imageSize', 'position', 'legacyHoverImageAssetRef', 'hoverImageAlt', 'hoverImageSize', 'hoverImagePosition', 'art']],
    [productCategory, ['legacyBannerAssetRef', 'bannerAlt']],
    [catalogStyle, ['legacyImageAssetRef', 'alt', 'position', 'size']],
  ] as const) {
    for (const name of fields) {
      const entry = field(schema as unknown as SchemaNode, name);
      assert.equal(entry?.hidden, true, `${schema.name}.${name} is hidden from editors`);
      assert.equal(entry?.readOnly, true, `${schema.name}.${name} is read-only`);
    }
  }
});

test('product size validation keeps current choices in history and protects previously published sizes', async () => {
  const field = (name: string) => product.fields.find((entry) => entry.name === name) as unknown as {
    validation: (rule: unknown) => unknown;
  };
  const validatorFor = (name: string) => {
    let validate: ((value: unknown, context: unknown) => unknown) | undefined;
    const rule = {
      required() { return this; },
      min() { return this; },
      max() { return this; },
      unique() { return this; },
      custom(callback: (value: unknown, context: unknown) => unknown) { validate = callback; return this; },
    };
    field(name).validation(rule);
    assert.ok(validate, `${name} registers its custom validator`);
    return validate;
  };

  const currentSizes = validatorFor('currentSizes');
  assert.match(String(currentSizes(['XXL'], { document: { legacySizes: ['One size'] } })), /历史询价尺码/);
  assert.equal(currentSizes(['XXL'], { document: { legacySizes: ['One size', 'XXL'] } }), true);

  const legacySizes = validatorFor('legacySizes');
  const context = {
    document: { _id: 'drafts.catalog-product-tee-white', sourceSizes: ['S'], currentSizes: ['M'] },
    getClient({ apiVersion }: { apiVersion: string }) {
      assert.equal(apiVersion, '2025-02-19');
      return {
        withConfig(options: { perspective: string }) {
          assert.deepEqual(options, { perspective: 'published' });
          return {
            async fetch(query: string, params: { id: string }) {
              assert.match(query, /legacySizes, currentSizes/);
              assert.deepEqual(params, { id: 'catalog-product-tee-white' });
              return { legacySizes: ['S', 'M', 'L'], currentSizes: ['S', 'M', 'L', 'XL'] };
            },
          };
        },
      };
    },
  };
  assert.match(String(await legacySizes(['S', 'M', 'L'], context)), /XL/);
  assert.equal(await legacySizes(['S', 'M', 'L', 'XL'], context), true);
});

test('catalog contract catches removed projected fields in each schema', () => {
  const productSchema = cloneSchema(product as unknown as SchemaNode);
  productSchema.fields = productSchema.fields?.filter((field) => !['name', 'currentSizes', 'image'].includes(field.name ?? ''));
  const categorySchema = cloneSchema(productCategory as unknown as SchemaNode);
  categorySchema.fields = categorySchema.fields?.filter((field) => field.name !== 'banner');
  const styleSchema = cloneSchema(catalogStyle as unknown as SchemaNode);
  styleSchema.fields = styleSchema.fields?.filter((field) => field.name !== 'href');

  const errors = checkCatalogContract({ productSchema, categorySchema, styleSchema });
  assert.ok(errors.some((error) => error.includes('product') && error.includes('name')));
  assert.ok(errors.some((error) => error.includes('product') && error.includes('currentSizes')));
  assert.ok(errors.some((error) => error.includes('product') && error.includes('image')));
  assert.ok(errors.some((error) => error.includes('category') && error.includes('banner')));
  assert.ok(errors.some((error) => error.includes('style') && error.includes('href')));
});

test('catalog contract catches query aliases or required fields being removed', () => {
  const queries = {
    ...catalogQueries,
    product: catalogQueries.product.replace('currentSizes, ', '').replace(/"assetRef": asset\._ref/g, ''),
    category: catalogQueries.category.replace(/"assetRef": asset\._ref/g, ''),
  };
  const errors = checkCatalogContract({ queries });
  assert.ok(errors.some((error) => error.includes('product query') && error.includes('currentSizes')));
  assert.ok(errors.some((error) => error.includes('product query') && error.includes('asset._ref')));
  assert.ok(errors.some((error) => error.includes('category query') && error.includes('asset._ref')));
});

test('optional hidden image size and position fields allow absent values but reject invalid CSS', () => {
  const customValidator = (schema: { fields: Array<{ name: string; validation?: (rule: unknown) => unknown }> }, name: string) => {
    const field = schema.fields.find((entry) => entry.name === name);
    assert.ok(field?.validation, `${name} exposes validation`);
    let validate: ((value: unknown) => true | string) | undefined;
    field.validation({
      custom(callback: (value: unknown) => true | string) {
        validate = callback;
        return this;
      },
    });
    assert.ok(validate, `${name} registers a custom validator`);
    return validate;
  };

  for (const [schema, names] of [
    [product, ['imageSize', 'position', 'hoverImageSize', 'hoverImagePosition']],
    [catalogStyle, ['size', 'position']],
  ] as const) {
    for (const name of names) {
      const validate = customValidator(schema as unknown as { fields: Array<{ name: string; validation?: (rule: unknown) => unknown }> }, name);
      assert.equal(validate(undefined), true, `${schema.name}.${name} allows an unset value`);
      assert.equal(validate(null), true, `${schema.name}.${name} allows null`);
      assert.notEqual(validate('not-valid-css'), true, `${schema.name}.${name} still rejects invalid CSS`);
    }
  }
});
