import { defineField, defineType } from 'sanity';
import { validateSafeHref } from './validation';

const stableId = () => `new-${crypto.randomUUID()}`;
const validCssSize = (value: unknown): true | string => (
  value === undefined || value === null
    ? true
    : typeof value === 'string' && /^(?:cover|contain|\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%)$/.test(value)
    ? true
    : '请输入 cover、contain，或两个百分比值（例如 200% 200%）。'
);
const validCssPosition = (value: unknown): true | string => (
  value === undefined || value === null
    ? true
    : typeof value === 'string' && /^(?:center|\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%)$/.test(value)
    ? true
    : '请输入 center，或两个百分比位置（例如 50% 0%）。'
);

export const catalogStyle = defineType({
  name: 'catalogStyle',
  title: '风格参考卡片',
  type: 'document',
  groups: [
    { name: 'identity', title: '卡片资料' },
    { name: 'image', title: '图片与显示位置' },
    { name: 'order', title: '排序与上架' },
  ],
  fields: [
    defineField({
      name: 'styleId', title: '稳定卡片编号', type: 'string', group: 'identity',
      initialValue: stableId, readOnly: true, hidden: true,
      validation: (rule) => rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    }),
    defineField({ name: 'name', title: '卡片名称', type: 'string', group: 'identity', validation: (rule) => rule.required().max(120) }),
    defineField({
      name: 'category', title: '所属分类', type: 'reference', group: 'identity',
      to: [{ type: 'productCategory' }], validation: (rule) => rule.required(),
    }),
    defineField({ name: 'href', title: '目标页面链接', type: 'string', group: 'identity', validation: (rule) => rule.required().max(500).custom(validateSafeHref) }),
    defineField({
      name: 'image', title: '卡片图片', type: 'image', group: 'image', options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: '替代文本', type: 'string', validation: (rule) => rule.max(240) })],
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'legacyImageAssetRef', title: '导入图片素材编号', type: 'string', group: 'image', hidden: true, readOnly: true }),
    defineField({ name: 'alt', title: '图片替代文本', type: 'string', group: 'image', hidden: true, readOnly: true, validation: (rule) => rule.required().max(240) }),
    defineField({ name: 'position', title: '图片显示位置', type: 'string', group: 'image', hidden: true, readOnly: true, initialValue: 'center', validation: (rule) => rule.custom(validCssPosition) }),
    defineField({
      name: 'size', title: '图片显示比例', type: 'string', group: 'image', initialValue: 'cover',
      hidden: true, readOnly: true,
      description: '原拼图素材继续使用百分比显示比例，单张图片使用 cover。',
      validation: (rule) => rule.custom(validCssSize),
    }),
    defineField({ name: 'sortOrder', title: '显示顺序', type: 'number', group: 'order', initialValue: 100, validation: (rule) => rule.required().integer().min(0) }),
    defineField({ name: 'active', title: '上架显示', type: 'boolean', group: 'order', initialValue: true }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'styleId', media: 'image' },
  },
});
