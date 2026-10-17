import { defineField, defineType } from 'sanity';

const stableId = () => `new-${crypto.randomUUID()}`;

export const productCategory = defineType({
  name: 'productCategory',
  title: '产品分类',
  type: 'document',
  groups: [
    { name: 'identity', title: '分类资料' },
    { name: 'appearance', title: '分类图片与展示' },
    { name: 'order', title: '排序与上架' },
  ],
  fields: [
    defineField({
      name: 'categoryId', title: '稳定分类编号', type: 'string', group: 'identity',
      initialValue: stableId, readOnly: true, hidden: true,
      validation: (rule) => rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    }),
    defineField({
      name: 'label', title: '分类名称', type: 'string', group: 'identity',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'styleLabel', title: '风格卡片分组标题', type: 'string', group: 'identity',
      description: '用于商品页的风格参考卡片。留空时沿用分类名称。',
      validation: (rule) => rule.max(80),
    }),
    defineField({
      name: 'banner', title: '分类横幅图片', type: 'image', group: 'appearance',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: '替代文本', type: 'string', validation: (rule) => rule.max(240) })],
    }),
    defineField({ name: 'legacyBannerAssetRef', title: '导入横幅素材编号', type: 'string', group: 'appearance', hidden: true, readOnly: true }),
    defineField({
      name: 'bannerAlt', title: '横幅替代文本', type: 'string', group: 'appearance',
      description: '未填写时使用横幅图片的替代文本。',
      hidden: true, readOnly: true, validation: (rule) => rule.max(240),
    }),
    defineField({
      name: 'showStyleReferences', title: '显示风格参考卡片', type: 'boolean', group: 'appearance',
      initialValue: false,
      description: '开启后，此分类会出现在商品页风格参考区域。',
    }),
    defineField({
      name: 'sortOrder', title: '显示顺序', type: 'number', group: 'order',
      initialValue: 100, validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'active', title: '上架显示', type: 'boolean', group: 'order',
      initialValue: true,
      description: '关闭后分类不再出现在公开筛选和横幅中；相关询价记录仍保留原编号。',
    }),
  ],
  preview: {
    select: { title: 'label', subtitle: 'categoryId', media: 'banner' },
  },
});
