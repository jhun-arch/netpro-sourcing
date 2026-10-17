import { zhHansLocale } from '@sanity/locale-zh-hans';
import { defineDocuments, defineLocations, presentationTool } from 'sanity/presentation';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './src/sanity/schemaTypes';
import {
  DRAFT_MODE_DISABLE_PATH,
  DRAFT_MODE_ENABLE_PATH,
  PRESENTATION_PREVIEW_PATH,
  SANITY_STUDIO_BASE_PATH,
} from './src/sanity/urls';

const projectId = '5mntophk';
const dataset = 'production';

export default defineConfig({
  name: 'default',
  title: 'Netpro 内容管理实验',
  projectId,
  dataset,
  basePath: SANITY_STUDIO_BASE_PATH,
  releases: { enabled: false },
  scheduledDrafts: { enabled: false },
  plugins: [
    structureTool({
      title: '内容管理',
      structure: (S) => S.list().id('content-management').title('内容管理').items([
        S.listItem()
          .title('页面管理')
          .id('page-management')
          .child(S.list().id('page-management-list').title('页面管理').items([
            S.listItem()
              .title('首页')
              .id('homePage')
              .child(S.document().schemaType('homePage').documentId('homePage')),
            S.listItem()
              .title('其他页面')
              .id('site-pages')
              .child(S.documentTypeList('sitePage').id('site-pages-list').title('选择页面')
                .defaultOrdering([{ field: 'label', direction: 'asc' }])),
          ])),
        S.listItem().title('产品管理').id('products')
          .child(S.documentTypeList('product').id('product-list').title('产品管理')
            .defaultOrdering([{ field: 'sortOrder', direction: 'asc' }])),
        S.listItem().title('产品分类').id('product-categories')
          .child(S.documentTypeList('productCategory').id('product-category-list').title('产品分类')
            .defaultOrdering([{ field: 'sortOrder', direction: 'asc' }])),
        S.listItem().title('定制款式入口').id('catalog-styles')
          .child(S.documentTypeList('catalogStyle').id('catalog-style-list').title('定制款式入口')
            .defaultOrdering([{ field: 'sortOrder', direction: 'asc' }])),
        S.listItem().title('全站设置').id('site-settings')
          .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      ]),
    }),
    presentationTool({
      title: '可视化编辑',
      previewUrl: {
        initial: PRESENTATION_PREVIEW_PATH,
        previewMode: {
          enable: DRAFT_MODE_ENABLE_PATH,
          disable: DRAFT_MODE_DISABLE_PATH,
        },
      },
      allowOrigins: ({ initialUrl }) => [initialUrl.origin],
      resolve: {
        mainDocuments: defineDocuments([
          { route: '/', filter: '_type == "homePage" && _id == "homePage"' },
          { route: '/privacy-policy', filter: '_type == "sitePage" && pageKey == "privacy-policy"' },
          { route: '/terms', filter: '_type == "sitePage" && pageKey == "terms"' },
          { route: '/:path', filter: '_type == "sitePage" && route == "/" + $path' },
        ]),
        locations: {
          homePage: defineLocations({ locations: [{ title: '首页', href: '/' }] }),
          sitePage: defineLocations({
            select: { title: 'label', route: 'route' },
            resolve: (doc) => ({ locations: typeof doc?.route === 'string' && /^\/[a-z0-9-]+\.html$/.test(doc.route)
              ? [{ title: doc.title || '查看页面', href: doc.route }] : [] }),
          }),
          product: defineLocations({ locations: [{ title: '产品目录', href: '/shop.html' }] }),
          productCategory: defineLocations({
            select: { id: 'categoryId', title: 'label' },
            resolve: (doc) => ({ locations: [typeof doc?.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.id)
              ? { title: doc.title || '查看分类', href: `/shop.html?category=${doc.id}` }
              : { title: '产品目录', href: '/shop.html' }] }),
          }),
          catalogStyle: defineLocations({ locations: [{ title: '定制款式目录', href: '/shop.html' }] }),
          siteSettings: defineLocations({ message: '导航用于全站；页脚用于首页以外的页面。首页页脚在首页中编辑。', tone: 'caution' }),
        },
      },
    }),
    zhHansLocale(),
  ],
  document: {
    newDocumentOptions: (previous) => previous.filter((option) => !['homePage', 'sitePage', 'siteSettings'].includes(option.templateId)),
    actions: (previous, context) => {
      if (['product', 'productCategory', 'catalogStyle'].includes(context.schemaType)) {
        // Archive using the content status; retain published identities for saved enquiries.
        return previous.filter((action) => !['duplicate', 'delete', 'unpublish'].includes(action.action ?? ''));
      }
      return ['homePage', 'sitePage', 'siteSettings'].includes(context.schemaType)
        ? previous.filter((action) => !['duplicate', 'delete', 'unpublish'].includes(action.action ?? ''))
        : previous;
    },
  },
  schema: { types: schemaTypes },
});
