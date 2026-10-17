import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import sanityConfigModule from '../sanity.config';
import sanityCliConfigModule from '../sanity.cli';
import {
  DRAFT_MODE_DISABLE_PATH,
  DRAFT_MODE_ENABLE_PATH,
  PRESENTATION_PREVIEW_PATH,
  SANITY_STUDIO_BASE_PATH,
} from '../src/sanity/urls';
import { createStructureBuilder, type StructureBuilder } from 'sanity/structure';

type StudioConfig = {
  title: string;
  projectId: string;
  dataset: string;
  basePath: string;
  document: {
    newDocumentOptions: (options: Array<{templateId: string}>) => Array<{templateId: string}>;
    actions: (actions: Array<{action: string}>, context: {schemaType: string}) => Array<{action: string}>;
  };
  plugins: Array<{
    name?: string;
    tools?: Array<{ options?: { structure?: unknown } }>;
  }>;
};

type SanityCliConfig = {
  api?: { projectId?: string; dataset?: string };
  deployment?: { appId?: string };
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
const cliConfigImport = sanityCliConfigModule as unknown as { default?: SanityCliConfig } & SanityCliConfig;
const cliConfig = cliConfigImport.default ?? cliConfigImport;

test('Studio keeps fixed page identities and archives catalog records without unpublishing', () => {
  const templates = ['homePage', 'sitePage', 'siteSettings', 'product', 'productCategory', 'catalogStyle']
    .map((templateId) => ({ templateId }));
  assert.deepEqual(config.document.newDocumentOptions(templates).map((option) => option.templateId),
    ['product', 'productCategory', 'catalogStyle']);
  const actions = ['publish', 'discardChanges', 'duplicate', 'delete', 'unpublish'].map((action) => ({ action }));
  for (const schemaType of templates.map((template) => template.templateId)) {
    assert.deepEqual(config.document.actions(actions, { schemaType }).map((action) => action.action),
      ['publish', 'discardChanges'], schemaType);
  }
});

test('Studio structure serializes and exposes pages, catalog, and shared settings', () => {
  const structureTool = config.plugins.find((plugin) => plugin.name === 'sanity/structure');
  const structureResolver = structureTool?.tools?.[0]?.options?.structure;
  assert.equal(typeof structureResolver, 'function');

  const source = {
    name: 'default',
    title: config.title,
    projectId: config.projectId,
    dataset: config.dataset,
    schema: {
      get: (name: string) => ({ name, title: name, type: { name: 'document' }, fields: [], orderings: [] }),
      getTypeNames: () => ['homePage', 'sitePage', 'siteSettings', 'product', 'productCategory', 'catalogStyle'],
    },
    templates: [],
    document: { resolveNewDocumentOptions: () => [] },
    i18n: { t: (key: string) => key },
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

  const otherPages = pageManagementList.items?.find((item) => item.id === 'site-pages');
  assert.equal(otherPages?.child?.type, 'documentList');
  for (const id of ['products', 'product-categories', 'catalog-styles']) {
    assert.equal(root.items?.find((item) => item.id === id)?.child?.type, 'documentList');
  }
  const settings = root.items?.find((item) => item.id === 'site-settings');
  assert.equal(settings?.child?.options?.id, 'siteSettings');
  assert.equal(settings?.child?.options?.type, 'siteSettings');
});

test('Studio, Presentation, draft routes, and external app registration share the configured URLs', () => {
  assert.equal(SANITY_STUDIO_BASE_PATH, '/studio');
  assert.equal(config.basePath, SANITY_STUDIO_BASE_PATH);
  assert.ok(existsSync(join(process.cwd(), 'app', 'studio', '[[...tool]]', 'page.tsx')));

  const presentationTool = config.plugins
    .flatMap((plugin) => plugin.tools ?? [])
    .find((tool) => (tool as { name?: string }).name === 'presentation') as {
      name?: string;
      options?: {
        previewUrl?: {
          initial?: string;
          previewMode?: { enable?: string; disable?: string };
        };
        allowOrigins?: (context: { initialUrl: URL }) => string[];
      };
    } | undefined;
  assert.ok(presentationTool);

  const previewUrl = presentationTool.options?.previewUrl;
  assert.equal(previewUrl?.initial, PRESENTATION_PREVIEW_PATH);
  assert.equal(previewUrl?.previewMode?.enable, DRAFT_MODE_ENABLE_PATH);
  assert.equal(previewUrl?.previewMode?.disable, DRAFT_MODE_DISABLE_PATH);
  for (const route of [DRAFT_MODE_ENABLE_PATH, DRAFT_MODE_DISABLE_PATH]) {
    const routeFile = join(process.cwd(), 'app', ...route.slice(1).split('/'), 'route.ts');
    assert.ok(existsSync(routeFile), `Presentation route ${route} should exist`);
  }

  for (const origin of ['http://localhost:3000', 'https://netprosourcing-git-experiment-nextjs-sanity-junhil.vercel.app']) {
    const presentationUrl: URL = new URL(previewUrl?.initial ?? '', origin);
    assert.equal(presentationUrl.origin, origin, 'relative Presentation URL should follow its hosting origin');
    assert.equal(presentationUrl.pathname, '/');
    const studioUrl = new URL(SANITY_STUDIO_BASE_PATH, origin);
    assert.equal(studioUrl.origin, origin);
    assert.equal(studioUrl.pathname, SANITY_STUDIO_BASE_PATH);
  }

  const initialUrl = new URL(previewUrl?.initial ?? '', 'http://localhost:3000');
  assert.deepEqual(presentationTool.options?.allowOrigins?.({ initialUrl }), [initialUrl.origin]);
  assert.equal(cliConfig.api?.projectId, config.projectId);
  assert.equal(cliConfig.api?.dataset, config.dataset);
  assert.equal(cliConfig.deployment?.appId, 'lms1plunpquzbvyrpkqshkyb');
});
