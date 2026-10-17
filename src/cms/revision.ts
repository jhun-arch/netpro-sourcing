import 'server-only';
import { createHash } from 'node:crypto';
import { cache } from 'react';
import { getSanityClient } from './client';

// Include catalog and shared settings: changing either can affect any page.
export const contentRevisionQuery = '*[_type in ["homePage", "sitePage", "siteSettings", "product", "productCategory", "catalogStyle"]] | order(_id asc) {_id, _rev}';

export const getContentRevision = cache(async (preview: boolean): Promise<string> => {
  const documents = await getSanityClient(preview).fetch<Array<{ _id: string; _rev: string }>>(
    contentRevisionQuery, {}, { cache: 'no-store' },
  );
  if (!documents.length) throw new Error('Content revisions are unavailable.');
  return createHash('sha256').update(JSON.stringify(documents)).digest('hex');
});
