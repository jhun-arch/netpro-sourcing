import 'server-only';
import { cache } from 'react';
import { getSanityClient, SanitySetupError } from '../cms/client';
import { projectCatalogData } from './project';
import { catalogCategoriesQuery, catalogProductsQuery, catalogStylesQuery } from './queries';
import type {
  CatalogCategoryDocument,
  CatalogData,
  CatalogProductDocument,
  CatalogStyleDocument,
} from './types';

export class CatalogContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogContentError';
  }
}

const fetchCatalog = cache(async (preview: boolean): Promise<CatalogData> => {
  const client = getSanityClient(preview);
  try {
    const [products, categories, styles] = await Promise.all([
      client.fetch<CatalogProductDocument[]>(catalogProductsQuery, {}, { cache: 'no-store' }),
      client.fetch<CatalogCategoryDocument[]>(catalogCategoriesQuery, {}, { cache: 'no-store' }),
      client.fetch<CatalogStyleDocument[]>(catalogStylesQuery, {}, { cache: 'no-store' }),
    ]);
    if (!Array.isArray(products) || !Array.isArray(categories) || !Array.isArray(styles)) {
      throw new CatalogContentError('Sanity returned an invalid catalogue response.');
    }
    return projectCatalogData({ products, categories, styles, preview });
  } catch (error) {
    if (error instanceof CatalogContentError || error instanceof SanitySetupError) throw error;
    throw new CatalogContentError('Sanity could not return the product catalogue. Check the experiment project, dataset, and published documents.');
  }
});

/** Read the full product identity set; the legacy client hides archived rows from public listings. */
export async function getCatalogData(preview = false): Promise<CatalogData> {
  return fetchCatalog(preview);
}
