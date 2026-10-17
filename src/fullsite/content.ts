import 'server-only';
import { draftMode } from 'next/headers';
import type { Metadata } from 'next';
import { cache } from 'react';
import { stegaClean } from 'next-sanity';
import { getSanityClient, SanitySetupError } from '../cms/client';
import { imageUrl } from '../cms/images';
import type { SitePageDocument, SiteSettingsDocument } from './types';
import { sitePageQuery, siteSettingsQuery } from './query';

export { sitePageQuery, siteSettingsQuery } from './query';

export class SiteContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteContentError';
  }
}

const fetchSitePage = cache(async (pageKey: string, preview: boolean): Promise<SitePageDocument | null> => {
  try {
    return await getSanityClient(preview).fetch<SitePageDocument | null>(
      sitePageQuery,
      { pageKey },
      { cache: 'no-store' },
    );
  } catch (error) {
    if (preview) {
      if (error instanceof SanitySetupError) throw error;
      throw new SiteContentError('预览页面内容暂不可用，请检查实验项目连接和页面文档。');
    }
    if (error instanceof SanitySetupError) return null;
    throw new SiteContentError('页面内容暂不可用。');
  }
});

const fetchSiteSettings = cache(async (preview: boolean): Promise<SiteSettingsDocument | null> => {
  try {
    return await getSanityClient(preview).fetch<SiteSettingsDocument | null>(
      siteSettingsQuery,
      {},
      { cache: 'no-store' },
    );
  } catch (error) {
    if (preview) {
      if (error instanceof SanitySetupError) throw error;
      throw new SiteContentError('预览全站设置暂不可用。');
    }
    if (error instanceof SanitySetupError) return null;
    throw new SiteContentError('全站设置暂不可用。');
  }
});

export async function isSitePreviewEnabled(): Promise<boolean> {
  return (await draftMode()).isEnabled;
}

export async function getSitePageData(pageKey: string, preview?: boolean): Promise<SitePageDocument | null> {
  const isPreview = preview ?? await isSitePreviewEnabled();
  return fetchSitePage(pageKey, isPreview);
}

export async function getSiteSettingsData(preview?: boolean): Promise<SiteSettingsDocument | null> {
  const isPreview = preview ?? await isSitePreviewEnabled();
  return fetchSiteSettings(isPreview);
}

function configuredOrigin(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const previewHost = process.env.VERCEL_URL;
  return new URL(configured ?? (previewHost ? `https://${previewHost}` : 'http://localhost:3000'));
}

export type StaticPageMetadata = {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalPath?: string;
};

function clean(value: string | undefined, fallback: string): string {
  return String(stegaClean(value?.trim() || fallback));
}

export async function getSitePageMetadata(
  page: SitePageDocument | null,
  route: string,
  staticFallback: StaticPageMetadata = {},
): Promise<Metadata> {
  const metadataBase = configuredOrigin();
  const seo = page?.seo;
  const title = clean(seo?.title, staticFallback.title || 'Netpro Sourcing');
  const description = clean(seo?.description, staticFallback.description || '');
  const ogTitle = clean(seo?.ogTitle, staticFallback.ogTitle || title);
  const ogDescription = clean(seo?.ogDescription, staticFallback.ogDescription || description);
  const metadata: Metadata = {
    metadataBase,
    title,
    description,
    alternates: { canonical: staticFallback.canonicalPath ?? route },
    // All deployments of this migration branch are experiments and must stay out of search indexes.
    robots: { index: false, follow: false, noarchive: true },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: 'website',
      url: route,
    },
    twitter: { card: 'summary_large_image', title: ogTitle, description: ogDescription },
  };
  if (seo?.ogImage?.asset?._ref || seo?.ogImage?.asset?._id) {
    metadata.openGraph = {
      ...metadata.openGraph,
      images: [{ url: imageUrl(seo.ogImage, { width: 1200, height: 630 }), alt: seo.ogImage.alt ?? '' }],
    };
    metadata.twitter = {
      card: 'summary_large_image', title: ogTitle, description: ogDescription,
      images: [imageUrl(seo.ogImage, { width: 1200, height: 630 })],
    };
  } else if (staticFallback.ogImage) {
    const imagePath = (() => {
      try { return new URL(staticFallback.ogImage!).pathname; } catch { return staticFallback.ogImage!; }
    })();
    metadata.openGraph = { ...metadata.openGraph, images: [{ url: imagePath }] };
    metadata.twitter = { card: 'summary_large_image', title: ogTitle, description: ogDescription, images: [imagePath] };
  }
  return metadata;
}
