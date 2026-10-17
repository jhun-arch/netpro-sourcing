'use client';

import { useEffect, useState } from 'react';
import {
  getPreviewPageKeyForPath,
  navigateToPreviewPage,
  PREVIEW_PAGE_OPTIONS,
} from './previewNavigation';

const GROUP_LABELS: Record<string, string> = {
  home: '首页',
  company: '站点信息',
  forms: '联系与询价',
  'custom-products': '定制产品',
  system: '系统页面',
  catalog: '商品目录',
  legal: '法律文件',
};

const PAGE_GROUPS = [...new Set(PREVIEW_PAGE_OPTIONS.map((page) => page.group))];

export default function PreviewPageSwitcher({ navigate }: { navigate?: (route: string) => void } = {}) {
  const [pathname, setPathname] = useState('');

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const value = getPreviewPageKeyForPath(pathname);

  return (
    <label
      data-preview-page-switcher
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.55rem 0.7rem',
        border: '1px solid #c8d0da',
        borderRadius: '0.45rem',
        background: '#fff',
        color: '#17243b',
        font: '600 0.8rem/1.2 Figtree, sans-serif',
        boxShadow: '0 3px 12px rgb(20 35 55 / 16%)',
      }}
    >
      <span>切换预览</span>
      <select
        aria-label="切换预览页面"
        value={value}
        onChange={(event) => navigateToPreviewPage(
          event.currentTarget.value,
          navigate ?? ((route) => window.location.assign(route)),
        )}
        style={{
          maxWidth: 'min(52vw, 18rem)',
          border: 0,
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
        }}
      >
        <option value="" disabled>选择页面</option>
        {PAGE_GROUPS.map((group) => (
          <optgroup key={group} label={GROUP_LABELS[group] ?? group}>
            {PREVIEW_PAGE_OPTIONS.filter((page) => page.group === group).map((page) => (
              <option key={page.pageKey} value={page.pageKey}>{page.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
