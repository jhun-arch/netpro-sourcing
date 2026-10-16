import 'server-only';
import { draftMode } from 'next/headers';
import type { Metadata } from 'next';
import { cache } from 'react';
import { getSanityClient, SanitySetupError } from './client';
import { imageUrl } from './images';
import { homePageQuery } from './query';
import type { HomePageSelection } from './types';

export class HomeContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HomeContentError';
  }
}

const fetchHomePageData = cache(async (preview: boolean): Promise<HomePageSelection> => {
  const client = getSanityClient(preview);
  try {
    const page = await client.fetch<HomePageSelection | null>(homePageQuery, {}, { cache: 'no-store' });
    if (!page) throw new HomeContentError('The homePage singleton has not been seeded or published.');
    return page;
  } catch (error) {
    if (error instanceof HomeContentError || error instanceof SanitySetupError) throw error;
    throw new HomeContentError('Sanity could not return homepage content. Check the project, dataset, CORS, and published document.');
  }
});

export async function getHomePageData(preview?: boolean): Promise<HomePageSelection> {
  const isPreview = preview ?? (await draftMode()).isEnabled;
  return fetchHomePageData(isPreview);
}

function configuredOrigin(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const previewHost = process.env.VERCEL_URL;
  const origin = configured ?? (previewHost ? `https://${previewHost}` : 'http://localhost:3000');
  return new URL(origin);
}

export async function getHomeMetadata(): Promise<Metadata> {
  const metadataBase = configuredOrigin();
  try {
    const preview = (await draftMode()).isEnabled;
    const page = await getHomePageData(preview);
    const { seo } = page;
    const image = imageUrl(seo.ogImage, { width: 1200, height: 630 });
    return {
      metadataBase,
      title: seo.title,
      description: seo.description,
      alternates: { canonical: '/' },
      robots: { index: false, follow: false },
      openGraph: {
        title: seo.ogTitle,
        description: seo.ogDescription,
        type: 'website',
        url: '/',
        images: [{ url: image, alt: seo.ogImage.alt ?? '' }],
      },
    };
  } catch {
    return {
      metadataBase,
      title: 'Homepage setup required | Netpro Sourcing',
      description: 'Homepage CMS content is not configured yet.',
      robots: { index: false, follow: false },
    };
  }
}
