'use client';

import { useEffect } from 'react';

const SCROLL_STORAGE_KEY = 'netpro-home-preview-scroll';
const POLL_INTERVAL_MS = 3000;

type RevisionResponse = { rev?: unknown };
type SavedScroll = { revision: string; x: number; y: number };

export default function PreviewRefresh({ revision }: { revision: string }) {
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (saved) {
        sessionStorage.removeItem(SCROLL_STORAGE_KEY);
        const position = JSON.parse(saved) as SavedScroll;
        if (position.revision !== revision && Number.isFinite(position.x) && Number.isFinite(position.y)) {
          window.requestAnimationFrame(() => window.scrollTo({ left: position.x, top: position.y, behavior: 'auto' }));
        }
      }
    } catch {
      // Preview refresh remains useful when browser storage is unavailable.
    }

    let disposed = false;
    let reloadRequested = false;

    const pollRevision = async () => {
      if (disposed || reloadRequested || document.visibilityState === 'hidden') return;

      try {
        const response = await fetch('/api/draft-mode/revision', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;

        const result = await response.json() as RevisionResponse;
        if (typeof result.rev !== 'string' || !result.rev || result.rev === revision) return;

        reloadRequested = true;
        try {
          const position: SavedScroll = { revision, x: window.scrollX, y: window.scrollY };
          sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(position));
        } catch {
          // Reload even if the browser blocks session storage.
        }
        window.location.reload();
      } catch {
        // A transient network failure is retried by the next three-second poll.
      }
    };

    const timer = window.setInterval(() => void pollRevision(), POLL_INTERVAL_MS);
    void pollRevision();

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [revision]);

  return (
    <a
      className="draft-preview-exit"
      href="/api/draft-mode/disable"
      aria-label="Exit homepage draft preview"
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        zIndex: 10000,
        padding: '0.7rem 1rem',
        borderRadius: '999px',
        background: '#17243b',
        color: '#fff',
        font: '600 0.875rem/1.2 Figtree, sans-serif',
        boxShadow: '0 4px 18px rgb(0 0 0 / 24%)',
        textDecoration: 'none',
      }}
    >
      Exit draft preview
    </a>
  );
}
