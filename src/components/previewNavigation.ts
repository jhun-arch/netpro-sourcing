export const PREVIEW_REVISION_QUERY_PARAM = 'previewRevision';
export const PREVIEW_SCROLL_STORAGE_KEY = 'netpro-home-preview-scroll';

export type SavedPreviewScroll = {
  revision: string;
  x: number;
  y: number;
  forceRestore?: boolean;
};

export function buildPreviewNavigationUrl(
  currentHref: string,
  expectedOrigin: string,
  revision: string,
): string | null {
  try {
    const url = new URL(currentHref);
    if (url.origin !== expectedOrigin || !revision) return null;

    url.searchParams.set(PREVIEW_REVISION_QUERY_PARAM, revision);
    return url.toString();
  } catch {
    return null;
  }
}
