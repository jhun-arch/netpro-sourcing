import assert from 'node:assert/strict';
import test from 'node:test';
import sanityConfigModule from '../sanity.config';
import { createStructureBuilder, type StructureBuilder } from 'sanity/structure';

type StudioConfig = {
  title: string;
  projectId: string;
  dataset: string;
  plugins: Array<{
    name?: string;
    tools?: Array<{ options?: { structure?: unknown } }>;
  }>;
};

type SerializedNode = {
  id?: string;
  type?: string;
  items?: SerializedNode[];
  child?: SerializedNode;
  options?: { id?: string; type?: string };
};

const configImport = sanityConfigModule as unknown as { default?: StudioConfig } & StudioConfig;
const config = configImport.default ?? configImport;

test('Studio structure serializes and exposes the homepage singleton and migration notice', () => {
  const structureTool = config.plugins.find((plugin) => plugin.name === 'sanity/structure');
  const structureResolver = structureTool?.tools?.[0]?.options?.structure;
  assert.equal(typeof structureResolver, 'function');

  const source = {
    name: 'default',
    title: config.title,
    projectId: config.projectId,
    dataset: config.dataset,
    schema: { get: () => undefined, getTypeNames: () => [] },
    templates: [],
    getClient: () => {
      throw new Error('The structure serializer should not request a Sanity client');
    },
  } as unknown as Parameters<typeof createStructureBuilder>[0]['source'];
  const builder = createStructureBuilder({ source, perspectiveStack: ['published'] });
  const root = (structureResolver as (structureBuilder: StructureBuilder) => { serialize: () => unknown })(builder)
    .serialize() as SerializedNode;

  assert.equal(root.type, 'list');
  const pageManagementItem = root.items?.find((item) => item.id === 'page-management');
  assert.ok(pageManagementItem);

  const pageManagementList = pageManagementItem.child;
  assert.equal(pageManagementList?.type, 'list');
  assert.ok(pageManagementList);

  const homePageItem = pageManagementList.items?.find((item) => item.id === 'homePage');
  assert.ok(homePageItem);
  assert.equal(homePageItem.child?.type, 'document');
  assert.equal(homePageItem.child?.options?.id, 'homePage');
  assert.equal(homePageItem.child?.options?.type, 'homePage');

  const migrationNoticeItem = pageManagementList.items?.find((item) => item.id === 'pages-not-migrated');
  assert.equal(migrationNoticeItem?.child?.type, 'component');
  assert.equal(migrationNoticeItem?.child?.id, 'not-migrated-notice');
});
