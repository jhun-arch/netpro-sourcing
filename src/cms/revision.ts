import 'server-only';
import { createHash } from 'node:crypto';
import { cache } from 'react';
import { getSanityClient } from './client';
import { contentRevisionQuery, isRevisionPageKey, serializeScopedRevision, type RevisionDocument } from './revisionScope';

export {
  contentRevisionQuery,
  isRevisionPageKey,
  scopeRevisionDocuments,
  serializeScopedRevision,
  type RevisionDocument,
} from './revisionScope';

export function createScopedContentRevision(documents: RevisionDocument[], pageKey: string): string {
  return createHash('sha256').update(serializeScopedRevision(documents, pageKey)).digest('hex');
}

export const getContentRevision = cache(async (preview: boolean, pageKey: string): Promise<string> => {
  if (!isRevisionPageKey(pageKey)) throw new Error('A registered preview page key is required.');
  const documents = await getSanityClient(preview).fetch<RevisionDocument[]>(
    contentRevisionQuery, { pageKey }, { cache: 'no-store' },
  );
  return createScopedContentRevision(documents, pageKey);
});
