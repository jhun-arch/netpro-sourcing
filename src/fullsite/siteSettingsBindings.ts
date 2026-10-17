import { SITE_PAGE_MANIFEST } from './pageManifest';

const HEADER_CATEGORY_LINKS = [
  ['header-shop-category-clothing', 'shop.html?category=clothing'],
  ['header-shop-category-socks', 'shop.html?category=socks'],
  ['header-shop-category-headwear', 'shop.html?category=headwear'],
  ['header-shop-category-bags', 'shop.html?category=bags'],
  ['header-shop-category-patches', 'shop.html?category=patches'],
] as const;

const HEADER_EXTERNAL_LINKS = [
  ['header-patches-embroidered', 'https://www.netpropatches.com/netpro2026/embroidered'],
  ['header-patches-pvc', 'https://www.netpropatches.com/netpro2026/pvc'],
  ['header-patches-chenille', 'https://www.netpropatches.com/netpro2026/chenille'],
  ['header-patches-woven', 'https://www.netpropatches.com/netpro2026/woven'],
] as const;

export const SITE_HEADER_BINDINGS = [
  { bindingId: 'header-shop', label: '主导航 · 商品目录', kind: 'link' as const, sourceHref: 'shop.html' },
  ...HEADER_CATEGORY_LINKS.map(([bindingId, sourceHref]) => ({
    bindingId,
    label: `主导航 · ${bindingId === 'header-shop-category-clothing' ? '服装' : bindingId === 'header-shop-category-socks' ? '袜类' : bindingId === 'header-shop-category-headwear' ? '帽类' : bindingId === 'header-shop-category-bags' ? '箱包' : '布贴'}`,
    kind: 'link' as const,
    sourceHref,
  })),
  ...SITE_PAGE_MANIFEST.filter((page) => page.group === 'custom-products' || ['about', 'case-studies', 'how-it-works', 'what-we-do', 'trends-digest', 'contact', 'quote'].includes(page.pageKey))
    .map((page) => ({ bindingId: `header-${page.pageKey}`, label: `主导航 · ${page.label}`, kind: 'link' as const, sourceHref: page.route.slice(1) })),
  ...HEADER_EXTERNAL_LINKS.map(([bindingId, sourceHref]) => ({ bindingId, label: `主导航 · ${bindingId.endsWith('embroidered') ? '刺绣布贴' : bindingId.endsWith('pvc') ? 'PVC 布贴' : bindingId.endsWith('chenille') ? '毛巾绣布贴' : '织唛布贴'}`, kind: 'link' as const, sourceHref })),
  { bindingId: 'header-customization-trigger', label: '主导航 · 定制入口', kind: 'text' as const },
  ...[
    ['all', '全部定制'], ['apparel', '服装'], ['headwear', '帽类'], ['socks', '袜类'], ['bags', '箱包'], ['patches', '布贴'],
  ].map(([tab, label]) => ({ bindingId: `header-customization-tab-${tab}`, label: `定制导航 · ${label}`, kind: 'text' as const, tab })),
] as const;

const footerLinkDefaults = [
  ['products-clothing', 'shop.html?category=clothing'], ['products-socks', 'shop.html?category=socks'],
  ['products-headwear', 'shop.html?category=headwear'], ['products-patches', 'shop.html?category=patches'],
  ['patches-embroidered', 'https://www.netpropatches.com/netpro2026/embroidered'],
  ['patches-pvc', 'https://www.netpropatches.com/netpro2026/pvc'],
  ['patches-chenille', 'https://www.netpropatches.com/netpro2026/chenille'],
  ['patches-woven', 'https://www.netpropatches.com/netpro2026/woven'],
  ['patches-site', 'https://www.netpropatches.com/netpro2026/'],
  ['company-about', 'about.html'], ['company-product', 'case-studies.html'],
  ['company-process', 'how-it-works.html'], ['company-services', 'what-we-do.html'],
  ['company-trends', 'trends-digest.html'], ['support-guide', 'buying-guide.html'],
  ['support-customization', 'how-it-works.html'], ['support-privacy', '/privacy-policy'],
] as const;

export const SITE_FOOTER_LINK_BINDINGS = footerLinkDefaults.map(([slug, sourceHref]) => ({ slug, sourceHref }));
