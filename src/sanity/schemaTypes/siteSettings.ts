import { defineField, defineType } from 'sanity';
import { validateSafeHref, validateSlotHref } from './validation';

const settingSlot = {
  name: 'siteSettingSlot',
  title: '共享内容项',
  type: 'object' as const,
  fields: [
    defineField({ name: 'bindingId', title: '固定绑定标识', type: 'string', hidden: true, readOnly: true, validation: (rule) => rule.required() }),
    defineField({ name: 'label', title: '编辑项名称', type: 'string', readOnly: true, validation: (rule) => rule.required().max(100) }),
    defineField({ name: 'kind', title: '内容类型', type: 'string', hidden: true, readOnly: true, options: { list: [{ title: '文字', value: 'text' }, { title: '链接', value: 'link' }] }, validation: (rule) => rule.required() }),
    defineField({ name: 'text', title: '文字内容', type: 'text', rows: 3, hidden: ({ parent }) => parent?.kind !== 'text', validation: (rule) => rule.max(1000) }),
    defineField({ name: 'href', title: '链接目标', type: 'string', hidden: ({ parent }) => parent?.kind !== 'link', validation: (rule) => rule.max(500).custom((value, context) => validateSlotHref(value, context as { parent?: { kind?: unknown } })) }),
    defineField({ name: 'linkLabel', title: '链接文字', type: 'string', hidden: ({ parent }) => parent?.kind !== 'link', validation: (rule) => rule.max(160) }),
  ],
  preview: { select: { title: 'label' } },
};

const footerSocial = {
  name: 'siteFooterSocial',
  title: '社交链接',
  type: 'object' as const,
  fields: [
    defineField({ name: 'slug', title: '固定标识', type: 'string', hidden: true, readOnly: true, validation: (rule) => rule.required() }),
    defineField({ name: 'label', title: '名称', type: 'string', validation: (rule) => rule.required().max(60) }),
    defineField({ name: 'href', title: '目标链接', type: 'string', validation: (rule) => rule.required().max(500).custom(validateSafeHref) }),
    defineField({ name: 'iconKey', title: '图标', type: 'string', options: { list: ['instagram', 'facebook', 'linkedin', 'x', 'pinterest', 'whatsapp'].map((value) => ({ title: value, value })) }, validation: (rule) => rule.required() }),
  ],
};

const footerLink = {
  name: 'siteFooterLink',
  title: '页脚链接',
  type: 'object' as const,
  fields: [
    defineField({ name: 'slug', title: '固定标识', type: 'string', hidden: true, readOnly: true, validation: (rule) => rule.required() }),
    defineField({ name: 'label', title: '链接文字', type: 'string', validation: (rule) => rule.required().max(100) }),
    defineField({ name: 'href', title: '目标链接', type: 'string', validation: (rule) => rule.required().max(500).custom(validateSafeHref) }),
  ],
};

const footerColumn = {
  name: 'siteFooterColumn',
  title: '页脚链接组',
  type: 'object' as const,
  fields: [
    defineField({ name: 'slug', title: '固定标识', type: 'string', hidden: true, readOnly: true, validation: (rule) => rule.required() }),
    defineField({ name: 'title', title: '分组标题', type: 'string', validation: (rule) => rule.required().max(60) }),
    defineField({ name: 'links', title: '链接', type: 'array', options: { sortable: false, disableActions: ['add', 'addBefore', 'addAfter', 'remove', 'duplicate', 'copy'] }, of: [footerLink], validation: (rule) => rule.required().min(1) }),
  ],
  preview: { select: { title: 'title' } },
};

export const siteSettings = defineType({
  name: 'siteSettings',
  title: '全站设置',
  type: 'document',
  groups: [
    { name: 'navigation', title: '全站导航' },
    { name: 'footer', title: '全站页脚' },
  ],
  fields: [
    defineField({ name: 'navigation', title: '导航内容', type: 'object', group: 'navigation', fields: [
      defineField({ name: 'slots', title: '导航文字与链接', type: 'array', options: { sortable: false, disableActions: ['add', 'addBefore', 'addAfter', 'remove', 'duplicate', 'copy'] }, of: [settingSlot], validation: (rule) => rule.required() }),
    ] }),
    defineField({ name: 'footer', title: '页脚内容', type: 'object', group: 'footer', fields: [
      defineField({ name: 'description', title: '品牌说明', type: 'text', rows: 2, validation: (rule) => rule.max(240) }),
      defineField({ name: 'newsletterTitle', title: '订阅标题', type: 'string', validation: (rule) => rule.max(100) }),
      defineField({ name: 'newsletterDescription', title: '订阅说明', type: 'string', validation: (rule) => rule.max(180) }),
      defineField({ name: 'emailPlaceholder', title: '邮箱输入提示', type: 'string', validation: (rule) => rule.max(80) }),
      defineField({ name: 'subscribeLabel', title: '订阅按钮文字', type: 'string', validation: (rule) => rule.max(60) }),
      defineField({ name: 'contactEmail', title: '联系邮箱', type: 'string', validation: (rule) => rule.email() }),
      defineField({ name: 'addressLines', title: '地址', type: 'array', of: [{ type: 'string' }], validation: (rule) => rule.max(6) }),
      defineField({ name: 'managerLabel', title: '联系人职务', type: 'string', validation: (rule) => rule.max(80) }),
      defineField({ name: 'managerName', title: '联系人姓名', type: 'string', validation: (rule) => rule.max(100) }),
      defineField({ name: 'socialLinks', title: '社交链接', type: 'array', options: { sortable: false, disableActions: ['add', 'addBefore', 'addAfter', 'remove', 'duplicate', 'copy'] }, of: [footerSocial], validation: (rule) => rule.min(1) }),
      defineField({ name: 'columns', title: '页脚链接组', type: 'array', options: { sortable: false, disableActions: ['add', 'addBefore', 'addAfter', 'remove', 'duplicate', 'copy'] }, of: [footerColumn], validation: (rule) => rule.min(1) }),
      defineField({ name: 'copyright', title: '版权文字', type: 'string', validation: (rule) => rule.max(160) }),
      defineField({ name: 'legalLink', title: '法律条款链接', type: 'object', fields: [
        defineField({ name: 'label', title: '链接文字', type: 'string', validation: (rule) => rule.max(80) }),
        defineField({ name: 'href', title: '目标链接', type: 'string', validation: (rule) => rule.max(500).custom(validateSafeHref) }),
      ] }),
      defineField({ name: 'tagline', title: '页脚品牌口号', type: 'string', validation: (rule) => rule.max(100) }),
    ] }),
  ],
  preview: { prepare: () => ({ title: '全站导航与页脚' }) },
});
