import assert from 'node:assert/strict';
import test from 'node:test';
import { HOME_PAGE_RENDER_BINDINGS } from '../src/components/homeRenderBindings';
import { checkHomePageContract } from '../src/cms/contracts';
import { homePage } from '../src/sanity/schemaTypes/homePage';

type SchemaNode = {
  name?: string;
  type?: string;
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

test('homepage renderer bindings resolve through nested Sanity schema and full-document query', () => {
  assert.deepEqual(checkHomePageContract(), []);
  assert.ok(HOME_PAGE_RENDER_BINDINGS.includes('benefits.intro.title'));
  assert.ok(HOME_PAGE_RENDER_BINDINGS.includes('faq.title'));
});

test('contract catches a removed nested field referenced by the renderer', () => {
  const schema = cloneSchema(homePage as unknown as SchemaNode);
  const hero = schema.fields?.find((field) => field.name === 'hero');
  assert.ok(hero?.fields);
  hero.fields = hero.fields.filter((field) => field.name !== 'body');

  const errors = checkHomePageContract({ schemaType: schema });
  assert.ok(errors.some((error) => error.includes('hero.body')));
});

test('contract rejects a query that projects away fields', () => {
  const errors = checkHomePageContract({ query: '*[_type == "homePage"][0]{seo}' });
  assert.ok(errors.some((error) => error.includes('full singleton document')));
});
