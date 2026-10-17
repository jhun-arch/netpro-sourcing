import type { HistoryAdapter } from '@sanity/visual-editing';

type BrowserNavigation = {
  location: Pick<Location, 'href' | 'origin' | 'assign' | 'replace'>;
  history: Pick<History, 'back'>;
  addEventListener: (event: 'popstate' | 'hashchange', listener: () => void) => void;
  removeEventListener: (event: 'popstate' | 'hashchange', listener: () => void) => void;
};

/** Legacy scripts require a fresh document even when Presentation changes routes. */
export function createFullDocumentHistory(getBrowser: () => BrowserNavigation): HistoryAdapter {
  return {
    subscribe(navigate) {
      const browser = getBrowser();
      const notify = () => navigate({ type: 'pop', url: browser.location.href });
      browser.addEventListener('popstate', notify);
      browser.addEventListener('hashchange', notify);
      navigate({ type: 'push', url: browser.location.href });
      return () => {
        browser.removeEventListener('popstate', notify);
        browser.removeEventListener('hashchange', notify);
      };
    },
    update(update) {
      const browser = getBrowser();
      if (update.type === 'pop') {
        browser.history.back();
        return;
      }
      let target: URL;
      try { target = new URL(update.url, browser.location.href); } catch { return; }
      if (!['http:', 'https:'].includes(target.protocol)
        || target.origin !== browser.location.origin || target.href === browser.location.href) return;
      if (update.type === 'replace') browser.location.replace(target.href);
      else browser.location.assign(target.href);
    },
  };
}
