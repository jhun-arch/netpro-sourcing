import { defineField, defineType } from 'sanity';
import { validateSlotHref } from './validation';
import { PAGE_BINDINGS } from '../../fullsite/pageBindings.generated';
import SitePageImageInput from '../components/SitePageImageInput';
import { IMAGE_GUIDANCE } from '../imageGuidance';

type TextLinesContext = { parent?: { kind?: string; textMode?: string; slotId?: string } };

export function validateSitePageTextLines(value: unknown, context: TextLinesContext): true | string {
  const parent = context.parent;
  if (parent?.kind !== 'text' || parent.textMode !== 'lines') return true;
  const binding = Object.values(PAGE_BINDINGS).flat().find((item) => item.slotId === parent.slotId);
  const expectedLines = binding?.textMode === 'lines' ? binding.textLines?.length : undefined;
  if (!expectedLines) return '此标题没有有效的固定行数绑定，请先修复页面模板绑定。';
  if (!Array.isArray(value) || value.length !== expectedLines) return `此标题必须保留原版 ${expectedLines} 行；请只修改每行文字。`;
  if (value.some((line) => typeof line !== 'string' || !line.trim())) return '分行标题的每一行都必须填写文字。';
  return true;
}

const pageSlot = {
  name: 'sitePageSlot',
  title: '页面内容项',
  type: 'object' as const,
  fields: [
    defineField({ name: 'slotId', title: '固定内容标识', type: 'string', hidden: true, readOnly: true, validation: (rule) => rule.required() }),
    defineField({ name: 'label', title: '编辑项名称', type: 'string', readOnly: true, validation: (rule) => rule.required().max(100) }),
    defineField({ name: 'kind', title: '内容类型', type: 'string', hidden: true, readOnly: true, options: { list: [{ title: '文字', value: 'text' }, { title: '图片', value: 'image' }, { title: '链接', value: 'link' }] }, validation: (rule) => rule.required() }),
    defineField({ name: 'editableLinkLabel', title: '允许编辑链接文字', type: 'boolean', hidden: true, readOnly: true }),
    defineField({ name: 'textMode', title: '文字格式', type: 'string', hidden: true, readOnly: true, options: { list: [{ title: '普通文字', value: 'plain' }, { title: '分行标题', value: 'lines' }] } }),
    defineField({ name: 'selector', title: '模板绑定', type: 'string', hidden: true, readOnly: true, validation: (rule) => rule.required() }),
    defineField({ name: 'textNodePath', title: '文字位置', type: 'string', hidden: true, readOnly: true }),
    defineField({ name: 'text', title: '文字内容', type: 'text', rows: 4, hidden: ({ parent }) => parent?.kind !== 'text' || parent?.textMode === 'lines', validation: (rule) => rule.max(3000) }),
    defineField({ name: 'textLines', title: '分行标题', description: '保持原版行数与顺序；仅修改各行文字。', type: 'array', options: { sortable: false, disableActions: ['add', 'addBefore', 'addAfter', 'remove', 'duplicate', 'copy'] }, of: [{ type: 'string' }], hidden: ({ parent }) => parent?.kind !== 'text' || parent?.textMode !== 'lines', validation: (rule) => rule.custom((value, context) => validateSitePageTextLines(value, context as TextLinesContext)) }),
    defineField({ name: 'image', title: '替换图片', type: 'image', options: { hotspot: true }, components: { input: SitePageImageInput }, hidden: ({ parent }) => parent?.kind !== 'image' }),
    defineField({ name: 'sourcePath', title: '原始图片路径', type: 'string', hidden: true, readOnly: true }),
    defineField({ name: 'alt', title: '替代文本', type: 'string', hidden: ({ parent }) => parent?.kind !== 'image', validation: (rule) => rule.max(240) }),
    defineField({ name: 'href', title: '链接目标', type: 'string', hidden: ({ parent }) => parent?.kind !== 'link', validation: (rule) => rule.max(500).custom((value, context) => validateSlotHref(value, context as TextLinesContext)) }),
    defineField({ name: 'linkLabel', title: '链接文字', type: 'string', hidden: ({ parent }) => parent?.kind !== 'link' || parent?.editableLinkLabel === false, validation: (rule) => rule.max(160) }),
  ],
  preview: { select: { title: 'label' } },
};

const pageSection = {
  name: 'sitePageSection',
  title: '页面模块',
  type: 'object' as const,
  fields: [
    defineField({ name: 'sectionId', title: '固定模块标识', type: 'string', hidden: true, readOnly: true, validation: (rule) => rule.required() }),
    defineField({ name: 'label', title: '模块名称', type: 'string', readOnly: true, validation: (rule) => rule.required().max(100) }),
    defineField({ name: 'slots', title: '可编辑内容', type: 'array', options: { sortable: false, disableActions: ['add', 'addBefore', 'addAfter', 'remove', 'duplicate', 'copy'] }, of: [pageSlot], validation: (rule) => rule.required() }),
  ],
  preview: { select: { title: 'label' } },
};

const seo = defineField({
  name: 'seo', title: '搜索与分享', type: 'object', group: 'seo', fields: [
    defineField({ name: 'title', title: '页面标题', type: 'string', validation: (rule) => rule.max(120) }),
    defineField({ name: 'description', title: '搜索摘要', type: 'text', rows: 3, validation: (rule) => rule.max(320) }),
    defineField({ name: 'ogTitle', title: '社交分享标题', type: 'string', validation: (rule) => rule.max(120) }),
    defineField({ name: 'ogDescription', title: '社交分享摘要', type: 'text', rows: 3, validation: (rule) => rule.max(320) }),
    defineField({ name: 'ogImage', title: '社交分享图片', type: 'image', description: IMAGE_GUIDANCE.socialShare, options: { hotspot: true }, fields: [defineField({ name: 'alt', title: '替代文本', type: 'string', validation: (rule) => rule.max(240) })] }),
  ],
});

export const sitePage = defineType({
  name: 'sitePage',
  title: '网站页面',
  type: 'document',
  groups: [
    { name: 'identity', title: '页面身份' },
    { name: 'content', title: '页面内容', default: true },
    { name: 'seo', title: '搜索与分享' },
  ],
  fields: [
    defineField({ name: 'pageKey', title: '固定页面标识', type: 'string', group: 'identity', hidden: true, readOnly: true, validation: (rule) => rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }),
    defineField({ name: 'route', title: '原页面地址', type: 'string', group: 'identity', hidden: true, readOnly: true, validation: (rule) => rule.required() }),
    defineField({ name: 'label', title: '页面名称', type: 'string', group: 'identity', readOnly: true, validation: (rule) => rule.required().max(100) }),
    defineField({ name: 'sections', title: '页面模块与内容', type: 'array', group: 'content', options: { sortable: false, disableActions: ['add', 'addBefore', 'addAfter', 'remove', 'duplicate', 'copy'] }, of: [pageSection], validation: (rule) => rule.required().min(1) }),
    seo,
  ],
  preview: { select: { title: 'label', subtitle: 'route' } },
});
