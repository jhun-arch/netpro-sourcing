'use client';

import { VisualEditing, type VisualEditingProps } from 'next-sanity/visual-editing';
import {
  buildPreviewNavigationUrl,
  PREVIEW_SCROLL_STORAGE_KEY,
  type SavedPreviewScroll,
} from './previewNavigation';

type RefreshHandler = NonNullable<VisualEditingProps['refresh']>;

const handleRefresh: RefreshHandler = (payload) => {
  if (payload.source === 'mutation') return false;

  const revision = `manual-${Date.now()}`;
  const targetUrl = buildPreviewNavigationUrl(
    window.location.href,
    window.location.origin,
    revision,
  );
  if (targetUrl) {
    try {
      const position: SavedPreviewScroll = {
        revision,
        x: window.scrollX,
        y: window.scrollY,
        forceRestore: true,
      };
      sessionStorage.setItem(PREVIEW_SCROLL_STORAGE_KEY, JSON.stringify(position));
    } catch {
      // Continue the full navigation when browser storage is unavailable.
    }
    window.location.replace(targetUrl);
  }

  // Keep the SDK from treating the navigation as a completed partial refresh.
  return new Promise<void>(() => undefined);
};

export default function DraftVisualEditing() {
  return <VisualEditing refresh={handleRefresh} />;
}
