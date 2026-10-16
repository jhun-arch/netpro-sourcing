'use client';

import { useEffect, useState } from 'react';
import {
  buildPreviewNavigationUrl,
  PREVIEW_SCROLL_STORAGE_KEY,
  type SavedPreviewScroll,
} from './previewNavigation';

const POLL_INTERVAL_MS = 3000;

type RevisionResponse = { rev?: unknown };
type RefreshStatus =
  | 'pending'
  | 'current'
  | 'http-401'
  | 'http-403'
  | 'http-503'
  | 'network-error'
  | 'refreshing';

type PollCallbacks = {
  onStatus: (status: RefreshStatus) => void;
  onRevision: (revision: string) => void;
  onRefresh: (revision: string) => void;
};

export async function pollPreviewRevision(
  revision: string,
  fetchRevision: typeof fetch,
  callbacks: PollCallbacks,
): Promise<void> {
  try {
    const response = await fetchRevision('/api/draft-mode/revision', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      callbacks.onStatus(
        response.status === 401 || response.status === 403 || response.status === 503
          ? `http-${response.status}`
          : 'network-error',
      );
      return;
    }

    const result = await response.json() as RevisionResponse;
    if (typeof result.rev !== 'string' || !result.rev) {
      callbacks.onStatus('network-error');
      return;
    }

    callbacks.onRevision(result.rev);
    if (result.rev === revision) {
      callbacks.onStatus('current');
      return;
    }

    callbacks.onStatus('refreshing');
    callbacks.onRefresh(result.rev);
  } catch {
    callbacks.onStatus('network-error');
  }
}

export default function PreviewRefresh({ revision }: { revision: string }) {
  const [status, setStatus] = useState<RefreshStatus>('pending');
  const [lastRevision, setLastRevision] = useState(revision);
  const [refreshTargetUrl, setRefreshTargetUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PREVIEW_SCROLL_STORAGE_KEY);
      if (saved) {
        sessionStorage.removeItem(PREVIEW_SCROLL_STORAGE_KEY);
        const position = JSON.parse(saved) as SavedPreviewScroll;
        if ((position.forceRestore === true || position.revision !== revision)
          && Number.isFinite(position.x)
          && Number.isFinite(position.y)) {
          window.requestAnimationFrame(() => window.scrollTo({ left: position.x, top: position.y, behavior: 'auto' }));
        }
      }
    } catch {
      // Preview refresh remains useful when browser storage is unavailable.
    }

    let disposed = false;
    let reloadRequested = false;
    let pollInFlight = false;

    const pollRevision = async () => {
      if (disposed || reloadRequested || pollInFlight || document.visibilityState === 'hidden') return;
      pollInFlight = true;

      try {
        await pollPreviewRevision(revision, fetch, {
          onStatus: (nextStatus) => {
            if (!disposed) setStatus(nextStatus);
          },
          onRevision: (nextRevision) => {
            if (!disposed) setLastRevision(nextRevision);
          },
          onRefresh: (nextRevision) => {
            if (disposed || reloadRequested) return;
            const targetUrl = buildPreviewNavigationUrl(
              window.location.href,
              window.location.origin,
              nextRevision,
            );
            if (!targetUrl) {
              setStatus('network-error');
              return;
            }

            setRefreshTargetUrl(targetUrl);
            reloadRequested = true;
            try {
              const position: SavedPreviewScroll = { revision, x: window.scrollX, y: window.scrollY };
              sessionStorage.setItem(PREVIEW_SCROLL_STORAGE_KEY, JSON.stringify(position));
            } catch {
              // Reload even if the browser blocks session storage.
            }
            window.location.replace(targetUrl);
          },
        });
      } catch {
        if (!disposed) setStatus('network-error');
        // A transient network failure is retried by the next three-second poll.
      } finally {
        pollInFlight = false;
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
    <>
      {refreshTargetUrl ? (
        <a
          className="draft-preview-refresh"
          href={refreshTargetUrl}
          target="_self"
          aria-label="草稿已更新，点击更新预览"
          style={{
            position: 'fixed',
            right: '1rem',
            bottom: '4.5rem',
            zIndex: 10000,
            padding: '0.7rem 1rem',
            borderRadius: '999px',
            background: '#31533d',
            color: '#fff',
            font: '600 0.875rem/1.2 Figtree, sans-serif',
            boxShadow: '0 4px 18px rgb(0 0 0 / 24%)',
            textDecoration: 'none',
          }}
        >
          草稿已更新，点击更新预览
        </a>
      ) : null}
      <a
        className="draft-preview-exit"
        href="/api/draft-mode/disable"
        aria-label="退出草稿预览"
        data-preview-refresh-status={status}
        data-preview-refresh-revision={lastRevision}
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
        退出草稿预览
      </a>
    </>
  );
}
