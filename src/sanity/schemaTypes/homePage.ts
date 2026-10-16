import { defineField, defineType } from 'sanity';
import { validateSafeHref } from './validation';

const stableSlug = (title = '内容标识') => defineField({
  name: 'slug',
  title,
  type: 'string',
  hidden: true,
  readOnly: true,
  initialValue: () => `item-${crypto.randomUUID()}`,
  validation: (rule) => rule.required().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

const image = (title = '图片', name = 'image') => defineField({
  name,
  title,
  type: 'image',
  options: { hotspot: true },
  fields: [defineField({ name: 'alt', title: '替代文本', type: 'string', validation: (rule) => rule.max(240) })],
  validation: (rule) => rule.required(),
});

const cta = (title: string) => defineField({
  name: 'cta',
  title,
  type: 'homeCta',
  validation: (rule) => rule.required(),
});

export const homePage = defineType({
  name: 'homePage',
  title: '首页',
  type: 'document',
  groups: [
    { name: 'hero', title: '首屏' },
    { name: 'collection', title: '产品分类' },
    { name: 'process', title: '合作流程' },
    { name: 'startingPoints', title: '合作入口' },
    { name: 'brandStory', title: '品牌故事与图库' },
    { name: 'benefits', title: '服务优势' },
    { name: 'faq', title: '联系与常见问题' },
    { name: 'closingCta', title: '页面末尾行动按钮' },
    { name: 'footer', title: '页脚' },
    { name: 'seo', title: '搜索与分享' },
  ],
  fields: [
    defineField({
      name: 'hero', title: '首屏内容', type: 'object', group: 'hero', fields: [
        defineField({ name: 'titleLines', title: '标题行', type: 'array', of: [{ type: 'string' }], validation: (rule) => rule.required().length(2) }),
        defineField({ name: 'body', title: '介绍文字', type: 'text', rows: 3, validation: (rule) => rule.required().max(320) }),
        defineField({ name: 'slides', title: '轮播图片', type: 'array', of: [{ type: 'object', name: 'heroSlide', title: '轮播图片', fields: [stableSlug(), image()], preview: { select: { title: 'image.alt', media: 'image' }, prepare: ({ title, media }) => ({ title: title || '首屏轮播图', media }) } }], validation: (rule) => rule.required().length(3) }),
        defineField({ name: 'primaryCta', title: '主要按钮', type: 'homeCta', validation: (rule) => rule.required() }),
        defineField({ name: 'secondaryCta', title: '次要按钮', type: 'homeCta', validation: (rule) => rule.required() }),
      ],
      preview: { prepare: () => ({ title: '首屏内容' }) },
    }),
    defineField({
      name: 'collection', title: '产品分类', type: 'object', group: 'collection', fields: [
        defineField({ name: 'eyebrow', title: '眉题', type: 'string', validation: (rule) => rule.required().max(80) }),
        defineField({ name: 'titleLines', title: '标题行', type: 'array', of: [{ type: 'string' }], validation: (rule) => rule.required().length(2) }),
        defineField({ name: 'body', title: '介绍文字', type: 'text', rows: 3, validation: (rule) => rule.required().max(320) }),
        cta('分类入口按钮'),
        defineField({ name: 'categories', title: '四类产品', type: 'array', of: [{ type: 'object', name: 'homeCategory', title: '产品分类', fields: [stableSlug(), defineField({ name: 'category', title: '分类标识', type: 'string', options: { list: [{ title: '服装', value: 'clothing' }, { title: '帽饰', value: 'headwear' }, { title: '袜子', value: 'socks' }, { title: '布贴', value: 'patches' }] }, validation: (rule) => rule.required() }), defineField({ name: 'title', title: '名称', type: 'string', validation: (rule) => rule.required().max(60) }), defineField({ name: 'description', title: '说明', type: 'text', rows: 2, validation: (rule) => rule.required().max(200) }), image(), cta('分类按钮')] }], validation: (rule) => rule.required().length(4) }),
      ],
    }),
    defineField({
      name: 'process', title: '合作流程', type: 'object', group: 'process', fields: [
        defineField({ name: 'titleLines', title: '标题行', type: 'array', of: [{ type: 'string' }], validation: (rule) => rule.required().length(2) }),
        defineField({ name: 'body', title: '介绍文字', type: 'string', validation: (rule) => rule.required().max(240) }),
        defineField({ name: 'steps', title: '三个步骤', type: 'array', of: [{ type: 'object', name: 'processStep', title: '流程步骤', fields: [stableSlug(), defineField({ name: 'title', title: '步骤名称', type: 'string', validation: (rule) => rule.required().max(80) }), defineField({ name: 'body', title: '步骤说明', type: 'text', rows: 2, validation: (rule) => rule.required().max(300) }), image()] }], validation: (rule) => rule.required().length(3) }),
        defineField({ name: 'primaryCta', title: '主要按钮', type: 'homeCta', validation: (rule) => rule.required() }),
        defineField({ name: 'secondaryCta', title: '次要按钮', type: 'homeCta', validation: (rule) => rule.required() }),
      ],
    }),
    defineField({
      name: 'startingPoints', title: '合作入口', type: 'object', group: 'startingPoints', fields: [
        defineField({ name: 'eyebrow', title: '眉题', type: 'string', validation: (rule) => rule.required().max(80) }),
        defineField({ name: 'title', title: '标题', type: 'string', validation: (rule) => rule.required().max(120) }),
        defineField({ name: 'body', title: '介绍文字', type: 'text', rows: 3, validation: (rule) => rule.required().max(320) }),
        defineField({ name: 'items', title: '两个合作入口', type: 'array', of: [{ type: 'object', name: 'startingPoint', title: '合作入口', fields: [stableSlug(), defineField({ name: 'title', title: '名称', type: 'string', validation: (rule) => rule.required().max(80) }), defineField({ name: 'body', title: '说明', type: 'text', rows: 3, validation: (rule) => rule.required().max(300) }), image(), cta('入口按钮')] }], validation: (rule) => rule.required().length(2) }),
      ],
    }),
    defineField({
      name: 'brandStory', title: '品牌故事与图库', type: 'object', group: 'brandStory', fields: [
        defineField({ name: 'title', title: '品牌标题', type: 'string', validation: (rule) => rule.required().max(180) }),
        defineField({ name: 'body', title: '品牌介绍', type: 'text', rows: 3, validation: (rule) => rule.required().max(360) }),
        cta('品牌故事按钮'),
        defineField({ name: 'galleryFilters', title: '图库筛选按钮', type: 'array', of: [{ type: 'object', name: 'galleryFilter', title: '筛选按钮', fields: [stableSlug(), defineField({ name: 'category', title: '类别', type: 'string', options: { list: [{ title: '全部', value: 'all' }, { title: '服装', value: 'clothing' }, { title: '帽饰', value: 'headwear' }, { title: '袜子', value: 'socks' }, { title: '布贴', value: 'patches' }] }, validation: (rule) => rule.required() }), defineField({ name: 'label', title: '按钮文字', type: 'string', validation: (rule) => rule.required().max(60) })] }], validation: (rule) => rule.required().length(5) }),
        defineField({ name: 'gallery', title: '产品图片长廊', type: 'array', of: [{ type: 'object', name: 'galleryItem', title: '图库图片', fields: [stableSlug(), defineField({ name: 'category', title: '分类标识', type: 'string', options: { list: ['clothing', 'headwear', 'socks', 'patches'] }, validation: (rule) => rule.required() }), defineField({ name: 'caption', title: '图片说明', type: 'string', validation: (rule) => rule.required().max(80) }), defineField({ name: 'href', title: '图片链接', type: 'string', validation: (rule) => rule.required().max(500).custom(validateSafeHref) }), defineField({ name: 'linkLabel', title: '无障碍链接文字', type: 'string', validation: (rule) => rule.required().max(120) }), image()] }], validation: (rule) => rule.required().min(1) }),
      ],
    }),
    defineField({
      name: 'benefits', title: '服务优势', type: 'object', group: 'benefits', fields: [
        defineField({ name: 'intro', title: '优势介绍', type: 'object', fields: [
          defineField({ name: 'title', title: '标题', type: 'string', validation: (rule) => rule.required().max(120) }),
          defineField({ name: 'body', title: '介绍文字', type: 'text', rows: 2, validation: (rule) => rule.required().max(280) }),
          defineField({ name: 'capabilities', title: '产品与服务标签', type: 'array', of: [{ type: 'string' }], validation: (rule) => rule.required().min(1).max(12) }),
        ] }),
        defineField({ name: 'items', title: '六项服务优势', type: 'array', of: [{ type: 'object', name: 'homeBenefit', title: '服务优势', fields: [stableSlug(), defineField({ name: 'title', title: '优势名称', type: 'string', validation: (rule) => rule.required().max(80) }), defineField({ name: 'body', title: '优势说明', type: 'text', rows: 2, validation: (rule) => rule.required().max(280) })] }], validation: (rule) => rule.required().length(6) }),
      ],
    }),
    defineField({
      name: 'faq', title: '联系与常见问题', type: 'object', group: 'faq', fields: [
        defineField({ name: 'title', title: '常见问题标题', type: 'string', validation: (rule) => rule.required().max(100) }),
        defineField({ name: 'contactTitle', title: '联系标题', type: 'string', validation: (rule) => rule.required().max(100) }),
        defineField({ name: 'contactBody', title: '联系说明', type: 'text', rows: 3, validation: (rule) => rule.required().max(300) }),
        defineField({ name: 'contactCta', title: '联系按钮', type: 'homeCta', validation: (rule) => rule.required() }),
        defineField({ name: 'items', title: '常见问题', type: 'array', of: [{ type: 'object', name: 'homeFaqItem', title: '常见问题', fields: [stableSlug(), defineField({ name: 'question', title: '问题', type: 'string', validation: (rule) => rule.required().max(200) }), defineField({ name: 'answer', title: '回答', type: 'text', rows: 4, validation: (rule) => rule.required().max(1000) })], preview: { select: { title: 'question' } } }], validation: (rule) => rule.required().min(1) }),
        defineField({ name: 'guideCta', title: '更多信息按钮', type: 'homeCta', validation: (rule) => rule.required() }),
      ],
    }),
    defineField({
      name: 'closingCta', title: '页面末尾行动按钮', type: 'object', group: 'closingCta', fields: [
        defineField({ name: 'titleLines', title: '标题行', type: 'array', of: [{ type: 'string' }], validation: (rule) => rule.required().length(2) }),
        cta('行动按钮'),
      ],
    }),
    defineField({
      name: 'footer', title: '页脚', type: 'object', group: 'footer', fields: [
        defineField({ name: 'description', title: '品牌说明', type: 'text', rows: 2, validation: (rule) => rule.required().max(240) }),
        defineField({ name: 'newsletterTitle', title: '订阅标题', type: 'string', validation: (rule) => rule.required().max(100) }),
        defineField({ name: 'newsletterDescription', title: '订阅说明', type: 'string', validation: (rule) => rule.required().max(180) }),
        defineField({ name: 'emailPlaceholder', title: '邮箱输入提示', type: 'string', validation: (rule) => rule.required().max(80) }),
        defineField({ name: 'subscribeLabel', title: '订阅按钮文字', type: 'string', validation: (rule) => rule.required().max(60) }),
        defineField({ name: 'contactEmail', title: '联系邮箱', type: 'string', validation: (rule) => rule.required().email() }),
        defineField({ name: 'addressLines', title: '地址', type: 'array', of: [{ type: 'string' }], validation: (rule) => rule.required().min(1).max(6) }),
        defineField({ name: 'managerLabel', title: '联系人职务', type: 'string', validation: (rule) => rule.required().max(80) }),
        defineField({ name: 'managerName', title: '联系人姓名', type: 'string', validation: (rule) => rule.required().max(100) }),
        defineField({ name: 'socialLinks', title: '社交链接', type: 'array', of: [{ type: 'object', name: 'socialLink', title: '社交链接', fields: [stableSlug(), defineField({ name: 'label', title: '名称', type: 'string', validation: (rule) => rule.required().max(60) }), defineField({ name: 'href', title: '目标链接', type: 'string', validation: (rule) => rule.required().max(500).custom(validateSafeHref) }), defineField({ name: 'iconKey', title: '图标', type: 'string', options: { list: ['instagram', 'facebook', 'linkedin', 'x', 'pinterest', 'whatsapp'].map((value) => ({ title: value, value })) }, validation: (rule) => rule.required() })] }], validation: (rule) => rule.required().min(1) }),
        defineField({ name: 'columns', title: '页脚链接组', type: 'array', of: [{ type: 'object', name: 'footerColumn', title: '链接组', fields: [stableSlug(), defineField({ name: 'title', title: '标题', type: 'string', validation: (rule) => rule.required().max(60) }), defineField({ name: 'links', title: '链接', type: 'array', of: [{ type: 'object', name: 'footerLink', title: '链接', fields: [stableSlug('链接标识'), defineField({ name: 'label', title: '链接文字', type: 'string', validation: (rule) => rule.required().max(80) }), defineField({ name: 'href', title: '目标链接', type: 'string', validation: (rule) => rule.required().max(500).custom(validateSafeHref) })] }], validation: (rule) => rule.required().min(1) })] }], validation: (rule) => rule.required().min(1) }),
        defineField({ name: 'copyright', title: '版权文字', type: 'string', validation: (rule) => rule.required().max(160) }),
        defineField({ name: 'legalLink', title: '法律条款链接', type: 'homeCta', validation: (rule) => rule.required() }),
        defineField({ name: 'tagline', title: '页脚品牌口号', type: 'string', validation: (rule) => rule.required().max(100) }),
      ],
    }),
    defineField({
      name: 'seo', title: '搜索与分享', type: 'object', group: 'seo', fields: [
        defineField({ name: 'title', title: '页面标题', type: 'string', validation: (rule) => rule.required().max(70) }),
        defineField({ name: 'description', title: '搜索摘要', type: 'text', rows: 3, validation: (rule) => rule.required().max(220) }),
        defineField({ name: 'ogTitle', title: '社交分享标题', type: 'string', validation: (rule) => rule.required().max(70) }),
        defineField({ name: 'ogDescription', title: '社交分享摘要', type: 'text', rows: 3, validation: (rule) => rule.required().max(220) }),
        image('社交分享图片', 'ogImage'),
      ],
    }),
  ],
  preview: {
    select: { title: 'seo.title', subtitle: '_updatedAt', media: 'seo.ogImage' },
  },
});
