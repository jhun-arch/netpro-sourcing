import type { SanityImage } from '../cms/types';

export type SiteSlotKind = 'text' | 'image' | 'link';

export type SitePageSlot = {
  _key: string;
  _type?: 'sitePageSlot';
  slotId: string;
  label: string;
  kind: SiteSlotKind;
  textMode?: 'plain' | 'lines';
  selector: string;
  textNodePath?: string;
  text?: string;
  textLines?: string[];
  image?: SanityImage | null;
  sourcePath?: string;
  alt?: string;
  href?: string;
  linkLabel?: string;
  editableLinkLabel?: boolean;
};

export type SitePageSection = {
  _key: string;
  _type?: 'sitePageSection';
  sectionId: string;
  label: string;
  slots: SitePageSlot[];
};

export type SitePageDocument = {
  _id: string;
  _rev: string;
  _type: 'sitePage';
  pageKey: string;
  route: string;
  label: string;
  sections: SitePageSection[];
  seo?: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: SanityImage | null;
  };
};

export type SiteSettingSlot = {
  _key: string;
  _type?: 'siteSettingSlot';
  bindingId: string;
  label: string;
  kind: 'text' | 'link';
  text?: string;
  href?: string;
  linkLabel?: string;
};

export type SiteFooterSocial = { _key: string; slug: string; label: string; href: string; iconKey: string };
export type SiteFooterLink = { _key: string; slug: string; label: string; href: string };
export type SiteFooterColumn = { _key: string; slug: string; title: string; links: SiteFooterLink[] };

export type SiteSettingsDocument = {
  _id: 'siteSettings';
  _rev: string;
  _type: 'siteSettings';
  navigation?: { slots: SiteSettingSlot[] };
  footer?: {
    description?: string;
    newsletterTitle?: string;
    newsletterDescription?: string;
    emailPlaceholder?: string;
    subscribeLabel?: string;
    contactEmail?: string;
    addressLines?: string[];
    managerLabel?: string;
    managerName?: string;
    socialLinks?: SiteFooterSocial[];
    columns?: SiteFooterColumn[];
    copyright?: string;
    legalLink?: { label?: string; href?: string };
    tagline?: string;
  };
};
