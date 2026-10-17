import { connection } from 'next/server';
import { getCatalogData } from '../../../src/catalog/catalog';
import type { CatalogData } from '../../../src/catalog/types';
import { SanitySetupError } from '../../../src/cms/client';
import { getSitePageData, getSitePageMetadata, getSiteSettingsData } from '../../../src/fullsite/content';
import { findSitePageByKey } from '../../../src/fullsite/pageManifest';
import { getLegacyPageShell, requiresCatalogBootstrap } from '../../../src/fullsite/templateRenderer';
import { createNotFoundPageResponse } from './document';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function responseForNotFound(includeBody: boolean): Promise<Response> {
  await connection();
  const entry = findSitePageByKey('404');
  if (!entry) throw new Error('The fixed 404 page is missing from the page manifest.');
  const [page, settings] = await Promise.all([
    getSitePageData(entry.pageKey, false),
    getSiteSettingsData(false),
  ]);
  let catalogData: CatalogData | null = null;
  if (requiresCatalogBootstrap(entry.pageKey)) {
    try {
      catalogData = await getCatalogData(false);
    } catch (error) {
      if (!(error instanceof SanitySetupError)) throw error;
    }
  }
  const metadata = await getSitePageMetadata(page, entry.route, getLegacyPageShell(entry.pageKey).metadata);
  return createNotFoundPageResponse({ page, settings, catalogData, metadata }, includeBody);
}

export async function GET(_request: Request): Promise<Response> {
  return responseForNotFound(true);
}

export async function HEAD(_request: Request): Promise<Response> {
  return responseForNotFound(false);
}
