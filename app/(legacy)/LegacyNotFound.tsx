import CatalogBootstrap from '../../src/catalog/CatalogBootstrap';
import { getCatalogData } from '../../src/catalog/catalog';
import { SanitySetupError } from '../../src/cms/client';
import { getSitePageData, getSitePageMetadata, getSiteSettingsData } from '../../src/fullsite/content';
import { getLegacyPageShell, getLegacyScripts, renderLegacyPageBody, requiresCatalogBootstrap } from '../../src/fullsite/templateRenderer';
import type { SitePageDocument, SiteSettingsDocument } from '../../src/fullsite/types';
import type { CatalogData } from '../../src/catalog/types';
import LegacyScripts from './[legacyPage]/LegacyScripts';
import { findSitePageByKey } from '../../src/fullsite/pageManifest';
import { createElement, Fragment, type ReactNode } from 'react';
import { connection } from 'next/server';

export type LegacyNotFoundData = {
  page: SitePageDocument | null;
  settings: SiteSettingsDocument | null;
  catalogData: CatalogData | null;
};

export async function getLegacyNotFoundData(): Promise<LegacyNotFoundData> {
  await connection();
  const [page, settings] = await Promise.all([
    getSitePageData('404', false),
    getSiteSettingsData(false),
  ]);
  let catalogData: CatalogData | null = null;
  if (requiresCatalogBootstrap('404')) {
    try {
      catalogData = await getCatalogData(false);
    } catch (error) {
      if (!(error instanceof SanitySetupError)) throw error;
    }
  }
  return { page, settings, catalogData };
}

export async function getLegacyNotFoundMetadata() {
  await connection();
  const page = await getSitePageData('404', false);
  const entry = findSitePageByKey('404');
  if (!entry) throw new Error('The fixed 404 page is missing from the page manifest.');
  return getSitePageMetadata(page, entry.route, getLegacyPageShell('404').metadata);
}

export function renderLegacyNotFoundBody(data: LegacyNotFoundData): ReactNode {
  const scripts = data.catalogData
    ? getLegacyScripts('404', { catalogBootstrap: true })
    : getLegacyScripts('404');
  return createElement(
    Fragment,
    null,
    data.catalogData ? createElement(CatalogBootstrap, { data: data.catalogData }) : null,
    renderLegacyPageBody('404', data.page, data.settings, false),
    createElement(LegacyScripts, { scripts }),
  );
}

export function renderGlobalLegacyNotFoundDocument(data: LegacyNotFoundData): ReactNode {
  const shell = getLegacyPageShell('404');
  return createElement(
    'html',
    { lang: shell.htmlLang },
    createElement('head', { dangerouslySetInnerHTML: { __html: shell.headHtml } }),
    createElement('body', { className: shell.bodyClass }, renderLegacyNotFoundBody(data)),
  );
}
