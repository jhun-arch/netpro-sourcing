import 'server-only';
import { createImageUrlBuilder } from '@sanity/image-url';
import { SANITY_DATASET, SANITY_PROJECT_ID } from './client';
import type { SanityImage } from './types';

export type ImageSize = { width: number; height: number };

const builder = createImageUrlBuilder({ projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET });

function checkedCdnUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'cdn.sanity.io') {
    throw new Error('Sanity returned an image URL outside its trusted CDN.');
  }
  return url;
}

export function imageUrl(image: SanityImage, size: ImageSize): string {
  if (!image.asset?._ref && !image.asset?._id) {
    throw new Error('Homepage image is missing its Sanity asset reference.');
  }
  if (size.width < 1 || size.height < 1) throw new Error('Image dimensions must be positive.');

  // The Sanity builder resolves the stored crop and hotspot when both output
  // dimensions are supplied; CSS object-fit then displays this focused crop.
  const url = builder.image(image).width(size.width).height(size.height).fit('crop').auto('format').url();
  return checkedCdnUrl(url);
}

export function hotspotPosition(image: SanityImage): string {
  const hotspot = image.hotspot;
  if (!hotspot) return '50% 50%';
  const x = Math.round(Math.max(0, Math.min(1, hotspot.x)) * 100);
  const y = Math.round(Math.max(0, Math.min(1, hotspot.y)) * 100);
  return `${x}% ${y}%`;
}

export function dataUrlImage(image: SanityImage): string | undefined {
  return image.asset?.metadata?.lqip;
}
