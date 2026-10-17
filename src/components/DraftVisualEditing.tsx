'use client';

import { VisualEditing } from '@sanity/visual-editing/react';
import type { VisualEditingOptions } from '@sanity/visual-editing';
import { createFullDocumentHistory } from './fullDocumentHistory';
import PreviewPageSwitcher from './PreviewPageSwitcher';
import {
  buildPreviewNavigationUrl,
  PREVIEW_SCROLL_STORAGE_KEY,
  type SavedPreviewScroll,
} from './previewNavigation';

type RefreshHandler = NonNullable<VisualEditingOptions['refresh']>;
const fullDocumentHistory = createFullDocumentHistory(() => window);

const DRAFT_VISUAL_EDITING_HIT_STYLES = `
  .home-page .hero-wash,
  .home-page .hero-copy {
    pointer-events: none;
  }

  .home-page .hero-copy h1,
  .home-page .hero-copy p,
  .home-page .hero-copy a {
    pointer-events: auto;
  }

  /* GSAP moves/fades the slides without changing their initial is-active class.
     Let the on-screen slide's transformed box receive the hit during transitions. */
  .home-page .hero-slides .hero-photo {
    pointer-events: auto;
  }

  @media (prefers-reduced-motion: reduce) {
    .home-page .hero-slides .hero-photo:not(.is-active) {
      pointer-events: none;
    }
  }
`;

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
  return (
    <>
      <style data-draft-visual-editing-hit-styles>{DRAFT_VISUAL_EDITING_HIT_STYLES}</style>
      <PreviewPageSwitcher />
      <VisualEditing portal history={fullDocumentHistory} refresh={handleRefresh} />
    </>
  );
}
