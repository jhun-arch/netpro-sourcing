import { SITE_PAGE_MANIFEST } from '../fullsite/pageManifest';

export const PREVIEW_REVISION_QUERY_PARAM = 'previewRevision';
export const PREVIEW_SCROLL_STORAGE_KEY = 'netpro-home-preview-scroll';
const HOME_PAGE_OPTION = { pageKey: 'home', route: '/', label: '首页', group: 'home' } as const;

export const PREVIEW_PAGE_OPTIONS = [HOME_PAGE_OPTION, ...SITE_PAGE_MANIFEST];

export type SavedPreviewScroll = {
  revision: string;
  x: number;
  y: number;
  forceRestore?: boolean;
};

export function getPreviewPageRoute(pageKey: string): string | undefined {
  return PREVIEW_PAGE_OPTIONS.find((page) => page.pageKey === pageKey)?.route;
}

export function navigateToPreviewPage(pageKey: string, navigate: (route: string) => void): boolean {
  const route = getPreviewPageRoute(pageKey);
  if (!route) return false;
  navigate(route);
  return true;
}

export function getPreviewPageKeyForPath(pathname: string): string {
  return PREVIEW_PAGE_OPTIONS.find((page) => page.route === pathname)?.pageKey ?? '';
}

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
