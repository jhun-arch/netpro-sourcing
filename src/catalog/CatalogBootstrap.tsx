import type { CatalogData } from './types';

export type CatalogBootstrapProps = { data: CatalogData };

export function serializeCatalogJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export default function CatalogBootstrap({ data }: CatalogBootstrapProps) {
  const script = [
    `window.NETPRO_PRODUCTS=${serializeCatalogJson(data.products)};`,
    `window.NETPRO_CATEGORIES=${serializeCatalogJson(data.categories)};`,
    `window.NETPRO_CATALOG_STYLES=${serializeCatalogJson({ categories: data.styles })};`,
    `window.NETPRO_CATALOG_REVISION=${serializeCatalogJson(data.revision)};`,
  ].join('');

  return <script id="netpro-catalog-bootstrap" dangerouslySetInnerHTML={{ __html: script }} />;
}
