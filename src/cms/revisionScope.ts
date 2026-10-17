import { findSitePageByKey } from '../fullsite/pageManifest';

export type RevisionDocument = {
  _id: string;
  _rev: string;
  _type: string;
  pageKey?: string;
};

const SHARED_REVISION_TYPES = new Set(['siteSettings', 'product', 'productCategory', 'catalogStyle']);

export const contentRevisionQuery = `*[
  _type in ["siteSettings", "product", "productCategory", "catalogStyle"]
  || ($pageKey == "home" && _type == "homePage")
  || ($pageKey != "home" && _type == "sitePage" && pageKey == $pageKey)
] | order(_id asc) {_id, _rev, _type, pageKey}`;

export function isRevisionPageKey(pageKey: unknown): pageKey is string {
  return pageKey === 'home' || (typeof pageKey === 'string' && Boolean(findSitePageByKey(pageKey)));
}

export function scopeRevisionDocuments(documents: RevisionDocument[], pageKey: string): RevisionDocument[] {
  if (!isRevisionPageKey(pageKey)) return [];
  return documents
    .filter((document) => SHARED_REVISION_TYPES.has(document._type)
      || (pageKey === 'home'
        ? document._type === 'homePage'
        : document._type === 'sitePage' && document.pageKey === pageKey))
    .sort((left, right) => left._id.localeCompare(right._id));
}

/** Stable hash input shared by the server implementation and ordinary Node tests. */
export function serializeScopedRevision(documents: RevisionDocument[], pageKey: string): string {
  const scopedDocuments = scopeRevisionDocuments(documents, pageKey);
  if (!scopedDocuments.length) throw new Error('Content revisions are unavailable.');
  return JSON.stringify(scopedDocuments.map(({ _id, _rev }) => ({ _id, _rev })));
}
