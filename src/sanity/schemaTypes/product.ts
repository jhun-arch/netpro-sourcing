import { defineField, defineType } from 'sanity';
import { validateSafeHref } from './validation';
import { validateSizeHistory } from '../../catalog/size-history-validation';

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
const validateOptionalSafeHref = (value: unknown): true | string => (
  typeof value !== 'string' || !value.trim() ? true : validateSafeHref(value)
);

export const product = defineType({
  name: 'product',
  title: '产品',
  type: 'document',
  groups: [
    { name: 'identity', title: '产品资料' },
    { name: 'images', title: '产品图片' },
    { name: 'sizes', title: '颜色与尺码' },
    { name: 'requests', title: '询价与定制' },
    { name: 'category', title: '分类与顺序' },
    { name: 'publication', title: '上架与归档' },
  ],
  fields: [
    defineField({
      name: 'productId', title: '稳定产品编号', type: 'string', group: 'identity',
      initialValue: stableId, readOnly: true,
      description: '用于关联现货、定制和历史询价；保存后不随产品名称或排序变化。',
      validation: (rule) => rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    }),
    defineField({ name: 'name', title: '产品名称', type: 'string', group: 'identity', validation: (rule) => rule.required().max(120) }),
    defineField({ name: 'description', title: '产品说明', type: 'text', rows: 3, group: 'identity', validation: (rule) => rule.required().max(1000) }),
    defineField({ name: 'isNew', title: '显示为新品', type: 'boolean', group: 'identity', initialValue: false }),
    defineField({
      name: 'image', title: '产品主图', type: 'image', group: 'images', options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: '替代文本', type: 'string', validation: (rule) => rule.max(240) })],
    }),
    defineField({ name: 'legacyImageAssetRef', title: '导入主图素材编号', type: 'string', group: 'images', hidden: true, readOnly: true }),
    defineField({
      name: 'imageAlt', title: '产品主图替代文本', type: 'string', group: 'images',
      hidden: true, readOnly: true, validation: (rule) => rule.max(240),
    }),
    defineField({
      name: 'imageSize', title: '主图显示比例', type: 'string', group: 'images',
      description: '仅用于兼容原有拼图素材的显示比例；普通单张图片使用 cover。',
      hidden: true, readOnly: true, initialValue: 'cover', validation: (rule) => rule.custom(validCssSize),
    }),
    defineField({ name: 'position', title: '主图显示位置', type: 'string', group: 'images', hidden: true, readOnly: true, initialValue: 'center', validation: (rule) => rule.custom(validCssPosition) }),
    defineField({
      name: 'hoverImage', title: '悬停展示图片', type: 'image', group: 'images', options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: '替代文本', type: 'string', validation: (rule) => rule.max(240) })],
    }),
    defineField({ name: 'legacyHoverImageAssetRef', title: '导入悬停图素材编号', type: 'string', group: 'images', hidden: true, readOnly: true }),
    defineField({ name: 'hoverImageAlt', title: '悬停图片替代文本', type: 'string', group: 'images', hidden: true, readOnly: true, validation: (rule) => rule.max(240) }),
    defineField({ name: 'hoverImageSize', title: '悬停图片显示比例', type: 'string', group: 'images', hidden: true, readOnly: true, initialValue: 'cover', validation: (rule) => rule.custom(validCssSize) }),
    defineField({ name: 'hoverImagePosition', title: '悬停图片显示位置', type: 'string', group: 'images', hidden: true, readOnly: true, initialValue: 'center', validation: (rule) => rule.custom(validCssPosition) }),
    defineField({
      name: 'art', title: '原站插画编号', type: 'string', group: 'images',
      hidden: true, readOnly: true,
      options: { list: Array.from({ length: 9 }, (_, index) => ({ title: `插画 ${index + 1}`, value: `catalog-${index}` })) },
    }),
    defineField({
      name: 'color', title: '参考颜色', type: 'string', group: 'sizes',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'swatch', title: '颜色标记', type: 'string', group: 'sizes',
      description: '填写十六进制颜色值，例如 #1d304c。',
      validation: (rule) => rule.required().regex(/^#[0-9a-fA-F]{6}$/),
    }),
    defineField({
      name: 'currentSizes', title: '当前可选尺码', type: 'array', group: 'sizes',
      initialValue: ['One size'],
      description: '新建产品默认使用 One size；如产品有具体尺码，请在发布前改为实际选项。',
      of: [{ type: 'string' }], validation: (rule) => rule.required().min(1).max(30).unique().custom((value, context) => {
        const history = (context.document as { legacySizes?: string[] } | undefined)?.legacySizes ?? [];
        const currentSizes = Array.isArray(value) ? value.filter((size): size is string => typeof size === 'string') : [];
        const missing = currentSizes.filter((size) => !history.includes(size));
        return missing.length ? `请先将新增尺码追加到“历史询价尺码”：${missing.join('、')}` : true;
      }),
    }),
    defineField({
      name: 'legacySizes', title: '历史询价尺码', type: 'array', group: 'sizes',
      initialValue: ['One size'],
      of: [{ type: 'string' }],
      description: '保留曾经可选过的尺码，供浏览器中已保存的旧询价继续识别。新增当前尺码时请先追加此列表；不要删除已用过的值。',
      validation: (rule) => rule.required().min(1).max(60).unique().custom(async (value, context) => {
        const document = context.document as { _id?: string; sourceSizes?: string[]; currentSizes?: string[] } | undefined;
        let publishedSizes: string[] = [];
        const id = document?._id?.replace(/^drafts\./, '');
        if (id) {
          try {
            const published = await context.getClient({ apiVersion: '2025-02-19' })
              .withConfig({ perspective: 'published' })
              .fetch<{ legacySizes?: string[]; currentSizes?: string[] } | null>(
              '*[_id == $id][0]{ legacySizes, currentSizes }',
              { id },
            );
            publishedSizes = [...(published?.legacySizes ?? []), ...(published?.currentSizes ?? [])];
          } catch {
            return '暂时无法核对已发布尺码记录，请稍后重试。';
          }
        }
        return validateSizeHistory({
          value,
          sourceSizes: document?.sourceSizes,
          currentSizes: document?.currentSizes,
          publishedSizes,
        });
      }),
    }),
    defineField({
      name: 'sourceSizes', title: '导入时尺码快照', type: 'array', group: 'sizes', hidden: true, readOnly: true,
      of: [{ type: 'string' }], validation: (rule) => rule.max(60).unique(),
    }),
    defineField({ name: 'customizationHref', title: '定制页面链接', type: 'string', group: 'requests', validation: (rule) => rule.max(500).custom(validateOptionalSafeHref) }),
    defineField({ name: 'externalCustomizationHref', title: '外部定制链接', type: 'string', group: 'requests', validation: (rule) => rule.max(500).custom(validateOptionalSafeHref) }),
    defineField({
      name: 'category', title: '产品分类', type: 'reference', group: 'category',
      to: [{ type: 'productCategory' }], validation: (rule) => rule.required(),
    }),
    defineField({ name: 'sortOrder', title: '显示顺序', type: 'number', group: 'category', initialValue: 100, validation: (rule) => rule.required().integer().min(0) }),
    defineField({
      name: 'active', title: '上架显示', type: 'boolean', group: 'publication', initialValue: true,
      description: '关闭后从公开目录隐藏。请使用归档，不要删除或取消发布；历史询价仍通过稳定产品编号识别。',
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'productId', media: 'image' },
  },
});
