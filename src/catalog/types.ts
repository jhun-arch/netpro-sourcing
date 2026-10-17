import type { SanityImage } from '../cms/types';

export type CatalogImage = SanityImage;
export type CatalogImageWithRef = CatalogImage & { assetRef?: string };

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  color: string;
  swatch: string;
  /** Current choices shown in the catalogue and product detail UI. */
  currentSizes: string[];
  /** Union of current and historical choices, used by the legacy enquiry validator. */
  sizes: string[];
  isNew: boolean;
  isActive: boolean;
  sortOrder: number;
  description: string;
  customizationHref?: string;
  externalCustomizationHref?: string;
  image?: string;
  imageAlt?: string;
  imageSize?: string;
  position?: string;
  hoverImage?: string;
  hoverImageAlt?: string;
  hoverImageSize?: string;
  hoverImagePosition?: string;
  art?: string;
  editing?: Partial<Record<'name' | 'description' | 'image' | 'hoverImage', string>>;
};

export type CatalogCategory = {
  id: string;
  label: string;
  banner?: string;
  bannerAlt?: string;
  sortOrder: number;
  styleLabel?: string;
  editing?: Partial<Record<'label' | 'banner', string>>;
};

export type CatalogStyleEntry = {
  slug: string;
  name: string;
  href: string;
  image: string;
  position: string;
  size: string;
  alt: string;
  sortOrder: number;
  editing?: Partial<Record<'name' | 'image', string>>;
};

export type CatalogStyleCategory = {
  id: string;
  label: string;
  sortOrder: number;
  entries: CatalogStyleEntry[];
  editing?: Partial<Record<'label', string>>;
};

export type CatalogData = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  styles: CatalogStyleCategory[];
  revision: string;
};

export type LegacyCatalogProduct = Omit<CatalogProduct, 'sizes' | 'currentSizes'> & {
  sizes: string[];
};

export type LegacyCatalogCategory = Omit<CatalogCategory, 'styleLabel'> & {
  styleLabel?: string;
  isActive?: boolean;
  showStyleReferences?: boolean;
};

export type LegacyCatalog = {
  version: number;
  products: LegacyCatalogProduct[];
  categories: LegacyCatalogCategory[];
  styles: Array<Omit<CatalogStyleCategory, 'entries'> & {
    entries: Array<CatalogStyleEntry & { isActive?: boolean }>;
  }>;
};

export type CatalogProductDocument = {
  _id?: string;
  _rev?: string;
  productId: string;
  name: string;
  categoryId?: string | null;
  currentSizes?: string[] | null;
  legacySizes?: string[] | null;
  sourceSizes?: string[] | null;
  color?: string;
  swatch?: string;
  isNew?: boolean;
  active?: boolean;
  sortOrder?: number;
  description?: string;
  customizationHref?: string;
  externalCustomizationHref?: string;
  image?: CatalogImage | null;
  legacyImageAssetRef?: string;
  imageAlt?: string;
  imageSize?: string;
  position?: string;
  hoverImage?: CatalogImage | null;
  legacyHoverImageAssetRef?: string;
  hoverImageAlt?: string;
  hoverImageSize?: string;
  hoverImagePosition?: string;
  art?: string;
};

export type CatalogCategoryDocument = {
  _id?: string;
  _rev?: string;
  categoryId: string;
  label: string;
  styleLabel?: string;
  sortOrder?: number;
  active?: boolean;
  showStyleReferences?: boolean;
  banner?: CatalogImage | null;
  legacyBannerAssetRef?: string;
  bannerAlt?: string;
};

export type CatalogStyleDocument = {
  _id?: string;
  _rev?: string;
  styleId: string;
  name: string;
  categoryId?: string | null;
  href: string;
  image?: CatalogImage | null;
  legacyImageAssetRef?: string;
  position?: string;
  size?: string;
  alt?: string;
  sortOrder?: number;
  active?: boolean;
};
