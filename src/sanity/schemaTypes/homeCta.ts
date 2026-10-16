import { defineField, defineType } from 'sanity';
import { validateSafeHref } from './validation';

export const homeCta = defineType({
  name: 'homeCta',
  title: '行动按钮',
  type: 'object',
  fields: [
    defineField({ name: 'label', title: '按钮文字', type: 'string', validation: (rule) => rule.required().max(80) }),
    defineField({ name: 'href', title: '目标链接', type: 'string', validation: (rule) => rule.required().max(500).custom(validateSafeHref) }),
  ],
  preview: { select: { title: 'label', subtitle: 'href' } },
});
