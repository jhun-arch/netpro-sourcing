import { collectSchemaPaths } from '../cms/contracts';
import { sitePage } from '../sanity/schemaTypes/sitePage';
import { siteSettings } from '../sanity/schemaTypes/siteSettings';
import { sitePageQuery, siteSettingsQuery } from './query';
import { PAGE_BINDINGS } from './pageBindings.generated';

type SchemaNode = {
  name?: string;
  type?: string;
  fields?: readonly SchemaNode[];
  of?: readonly SchemaNode[];
};

export type FullsiteContractInput = {
  sitePageSchema?: SchemaNode;
  siteSettingsSchema?: SchemaNode;
  pageQuery?: string;
  settingsQuery?: string;
};

const SITE_PAGE_RENDERER_FIELDS = [
  'pageKey', 'route', 'label',
  'sections[] ._key',
  'sections[] .sectionId',
  'sections[] .label',
  'sections[] .slots[] ._key',
  'sections[] .slots[] .slotId',
  'sections[] .slots[] .label',
  'sections[] .slots[] .kind',
  'sections[] .slots[] .textMode',
  'sections[] .slots[] .selector',
  'sections[] .slots[] .textNodePath',
  'sections[] .slots[] .text',
  'sections[] .slots[] .textLines',
  'sections[] .slots[] .image',
  'sections[] .slots[] .sourcePath',
  'sections[] .slots[] .alt',
  'sections[] .slots[] .href',
  'sections[] .slots[] .linkLabel',
  'sections[] .slots[] .editableLinkLabel',
  'seo.title', 'seo.description', 'seo.ogTitle', 'seo.ogDescription', 'seo.ogImage', 'seo.ogImage.alt',
];

const SITE_SETTINGS_RENDERER_FIELDS = [
  'navigation.slots[] ._key',
  'navigation.slots[] .bindingId', 'navigation.slots[] .label', 'navigation.slots[] .kind',
  'navigation.slots[] .text', 'navigation.slots[] .href', 'navigation.slots[] .linkLabel',
  'footer.description', 'footer.newsletterTitle', 'footer.newsletterDescription',
  'footer.emailPlaceholder', 'footer.subscribeLabel', 'footer.contactEmail',
  'footer.addressLines', 'footer.managerLabel', 'footer.managerName',
  'footer.addressLines[]',
  'footer.socialLinks[] ._key', 'footer.socialLinks[] .slug', 'footer.socialLinks[] .label', 'footer.socialLinks[] .href', 'footer.socialLinks[] .iconKey',
  'footer.columns[] ._key', 'footer.columns[] .slug', 'footer.columns[] .title',
  'footer.columns[] .links[] ._key', 'footer.columns[] .links[] .slug', 'footer.columns[] .links[] .label', 'footer.columns[] .links[] .href',
  'footer.copyright', 'footer.legalLink.label', 'footer.legalLink.href', 'footer.tagline',
];

function isProjectionFreeSingletonQuery(query: string): boolean {
  const normalized = query.trim();
  return /^\*\[[\s\S]+\]\[0\]$/.test(normalized) && !normalized.includes(']{');
}

function checkFields(schema: Set<string>, fields: readonly string[], errors: string[], label: string): void {
  for (const field of fields) {
    const normalized = field.replace(/\s+/g, '');
    if (!schema.has(normalized)) errors.push(`${label} renderer reads field missing from nested schema: ${normalized}`);
  }
}

/** Validates the complete deeply-bound page and shared-settings documents against their Sanity schemas. */
export function checkFullsiteContract(input: FullsiteContractInput = {}): string[] {
  const errors: string[] = [];
  const pageSchema = collectSchemaPaths(input.sitePageSchema ?? sitePage);
  const settingsSchema = collectSchemaPaths(input.siteSettingsSchema ?? siteSettings);
  checkFields(pageSchema, SITE_PAGE_RENDERER_FIELDS, errors, 'sitePage');
  checkFields(settingsSchema, SITE_SETTINGS_RENDERER_FIELDS, errors, 'siteSettings');

  for (const [pageKey, bindings] of Object.entries(PAGE_BINDINGS)) {
    if (!bindings.length) errors.push(`sitePage ${pageKey} has no fixed renderer bindings.`);
    for (const binding of bindings) {
      if (binding.kind === 'text') {
        const field = binding.textMode === 'lines' ? 'textLines' : 'text';
        const path = `sections[] .slots[] .${field}`.replace(/\s+/g, '');
        if (!pageSchema.has(path)) errors.push(`sitePage renderer reads field missing from nested schema: ${path}`);
      } else if (binding.kind === 'image') {
        for (const field of ['image', 'alt', 'sourcePath']) {
          const path = `sections[] .slots[] .${field}`.replace(/\s+/g, '');
          if (!pageSchema.has(path)) errors.push(`sitePage renderer reads field missing from nested schema: ${path}`);
        }
      } else {
        for (const field of binding.editableLinkLabel === false ? ['href'] : ['href', 'linkLabel']) {
          const path = `sections[] .slots[] .${field}`.replace(/\s+/g, '');
          if (!pageSchema.has(path)) errors.push(`sitePage renderer reads field missing from nested schema: ${path}`);
        }
      }
    }
  }

  if (!isProjectionFreeSingletonQuery(input.pageQuery ?? sitePageQuery)) {
    errors.push('sitePage query must return the full page document without a field projection.');
  }
  if (!isProjectionFreeSingletonQuery(input.settingsQuery ?? siteSettingsQuery)) {
    errors.push('siteSettings query must return the full singleton document without a field projection.');
  }
  return [...new Set(errors)];
}

export const FULLSITE_RENDERER_FIELDS = {
  sitePage: SITE_PAGE_RENDERER_FIELDS,
  siteSettings: SITE_SETTINGS_RENDERER_FIELDS,
} as const;
