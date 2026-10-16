import { zhHansLocale } from '@sanity/locale-zh-hans';
import { presentationTool } from 'sanity/presentation';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { NotMigratedNotice } from './src/sanity/NotMigratedNotice';
import { schemaTypes } from './src/sanity/schemaTypes';

const projectId = '5mntophk';
const dataset = 'production';

export default defineConfig({
  name: 'default',
  title: 'Netpro 内容管理实验',
  projectId,
  dataset,
  basePath: '/studio',
  releases: { enabled: false },
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
              .title('About / Customization（待迁移）')
              .id('pages-not-migrated')
              .child(S.component(NotMigratedNotice).id('not-migrated-notice').title('迁移范围说明')),
          ])),
      ]),
    }),
    presentationTool({
      title: '可视化编辑',
      previewUrl: {
        initial: '/',
        previewMode: {
          enable: '/api/draft-mode/enable',
          disable: '/api/draft-mode/disable',
        },
      },
      allowOrigins: ({ initialUrl }) => [initialUrl.origin],
    }),
    zhHansLocale(),
  ],
  document: {
    newDocumentOptions: (previous) => previous.filter((option) => option.templateId !== 'homePage'),
    actions: (previous, context) => context.schemaType === 'homePage'
      ? previous.filter((action) => action.action !== 'duplicate' && action.action !== 'delete')
      : previous,
  },
  schema: { types: schemaTypes },
});
