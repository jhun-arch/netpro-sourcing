/** Browser-safe route registry. The IDs and routes are persisted CMS identities. */
export const SITE_PAGE_MANIFEST = [
  { pageKey: 'about', route: '/about.html', label: '关于 Netpro', docId: 'sitePage-about', group: 'company' },
  { pageKey: 'buying-guide', route: '/buying-guide.html', label: '采购指南与常见问题', docId: 'sitePage-buying-guide', group: 'company' },
  { pageKey: 'case-studies', route: '/case-studies.html', label: 'Product 产品展示', docId: 'sitePage-case-studies', group: 'company' },
  { pageKey: 'contact', route: '/contact.html', label: '联系页面', docId: 'sitePage-contact', group: 'forms' },
  { pageKey: 'custom-ankle-socks', route: '/custom-ankle-socks.html', label: '定制踝袜', docId: 'sitePage-custom-ankle-socks', group: 'custom-products' },
  { pageKey: 'custom-athletic-socks', route: '/custom-athletic-socks.html', label: '定制运动袜', docId: 'sitePage-custom-athletic-socks', group: 'custom-products' },
  { pageKey: 'custom-backpacks', route: '/custom-backpacks.html', label: '定制双肩包', docId: 'sitePage-custom-backpacks', group: 'custom-products' },
  { pageKey: 'custom-baseball-caps', route: '/custom-baseball-caps.html', label: '定制棒球帽', docId: 'sitePage-custom-baseball-caps', group: 'custom-products' },
  { pageKey: 'custom-beanies', route: '/custom-beanies.html', label: '定制针织帽', docId: 'sitePage-custom-beanies', group: 'custom-products' },
  { pageKey: 'custom-bucket-hats', route: '/custom-bucket-hats.html', label: '定制渔夫帽', docId: 'sitePage-custom-bucket-hats', group: 'custom-products' },
  { pageKey: 'custom-camper-hats', route: '/custom-camper-hats.html', label: '定制 Camp 帽', docId: 'sitePage-custom-camper-hats', group: 'custom-products' },
  { pageKey: 'custom-compression-socks', route: '/custom-compression-socks.html', label: '定制压力袜', docId: 'sitePage-custom-compression-socks', group: 'custom-products' },
  { pageKey: 'custom-crew-socks', route: '/custom-crew-socks.html', label: '定制中筒袜', docId: 'sitePage-custom-crew-socks', group: 'custom-products' },
  { pageKey: 'custom-dad-hats', route: '/custom-dad-hats.html', label: '定制 Dad Hat', docId: 'sitePage-custom-dad-hats', group: 'custom-products' },
  { pageKey: 'custom-hoodies', route: '/custom-hoodies.html', label: '定制连帽卫衣', docId: 'sitePage-custom-hoodies', group: 'custom-products' },
  { pageKey: 'custom-jerseys', route: '/custom-jerseys.html', label: '定制球衣', docId: 'sitePage-custom-jerseys', group: 'custom-products' },
  { pageKey: 'custom-knee-high-socks', route: '/custom-knee-high-socks.html', label: '定制及膝袜', docId: 'sitePage-custom-knee-high-socks', group: 'custom-products' },
  { pageKey: 'custom-no-show-socks', route: '/custom-no-show-socks.html', label: '定制隐形袜', docId: 'sitePage-custom-no-show-socks', group: 'custom-products' },
  { pageKey: 'custom-novelty-socks', route: '/custom-novelty-socks.html', label: '定制趣味袜', docId: 'sitePage-custom-novelty-socks', group: 'custom-products' },
  { pageKey: 'custom-patches', route: '/custom-patches.html', label: '定制布贴', docId: 'sitePage-custom-patches', group: 'custom-products' },
  { pageKey: 'custom-snapbacks', route: '/custom-snapbacks.html', label: '定制 Snapback 帽', docId: 'sitePage-custom-snapbacks', group: 'custom-products' },
  { pageKey: 'custom-sweatshirts', route: '/custom-sweatshirts.html', label: '定制圆领卫衣', docId: 'sitePage-custom-sweatshirts', group: 'custom-products' },
  { pageKey: 'custom-t-shirts', route: '/custom-t-shirts.html', label: '定制 T 恤', docId: 'sitePage-custom-t-shirts', group: 'custom-products' },
  { pageKey: 'custom-tote-bags', route: '/custom-tote-bags.html', label: '定制托特包', docId: 'sitePage-custom-tote-bags', group: 'custom-products' },
  { pageKey: 'custom-trucker-caps', route: '/custom-trucker-caps.html', label: '定制卡车帽', docId: 'sitePage-custom-trucker-caps', group: 'custom-products' },
  { pageKey: 'custom-varsity-jackets', route: '/custom-varsity-jackets.html', label: '定制棒球夹克', docId: 'sitePage-custom-varsity-jackets', group: 'custom-products' },
  { pageKey: 'custom-visors', route: '/custom-visors.html', label: '定制遮阳帽', docId: 'sitePage-custom-visors', group: 'custom-products' },
  { pageKey: 'custom-wool-socks', route: '/custom-wool-socks.html', label: '定制羊毛袜', docId: 'sitePage-custom-wool-socks', group: 'custom-products' },
  { pageKey: '404', route: '/404.html', label: '自定义 404 页面', docId: 'sitePage-404', group: 'system' },
  { pageKey: 'how-it-works', route: '/how-it-works.html', label: '定制流程与工艺', docId: 'sitePage-how-it-works', group: 'company' },
  { pageKey: 'privacy-policy', route: '/privacy-policy.html', label: '隐私政策', docId: 'sitePage-privacy-policy', group: 'legal' },
  { pageKey: 'quote', route: '/quote.html', label: '项目询价', docId: 'sitePage-quote', group: 'forms' },
  { pageKey: 'shop', route: '/shop.html', label: '商品目录', docId: 'sitePage-shop', group: 'catalog' },
  { pageKey: 'submission-success', route: '/submission-success.html', label: '提交确认页面', docId: 'sitePage-submission-success', group: 'forms' },
  { pageKey: 'terms', route: '/terms.html', label: '使用条款', docId: 'sitePage-terms', group: 'legal' },
  { pageKey: 'trends-digest', route: '/trends-digest.html', label: '趋势简报', docId: 'sitePage-trends-digest', group: 'company' },
  { pageKey: 'what-we-do', route: '/what-we-do.html', label: '服务范围', docId: 'sitePage-what-we-do', group: 'company' },
] as const;

export type SitePageManifestEntry = (typeof SITE_PAGE_MANIFEST)[number];
export type SitePageKey = SitePageManifestEntry['pageKey'];

export const CHECKOUT_REDIRECT_ROUTE = {
  route: '/checkout.html',
  destination: '/quote.html',
} as const;

export function findSitePageByRoute(route: string): SitePageManifestEntry | undefined {
  return SITE_PAGE_MANIFEST.find((page) => page.route === route);
}

export function findSitePageByKey(pageKey: string): SitePageManifestEntry | undefined {
  return SITE_PAGE_MANIFEST.find((page) => page.pageKey === pageKey);
}
