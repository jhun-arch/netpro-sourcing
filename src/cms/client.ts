import 'server-only';
import { createClient } from 'next-sanity';

export const SANITY_PROJECT_ID = '5mntophk';
export const SANITY_DATASET = 'production';
export const SANITY_API_VERSION = '2025-02-19';

export class SanitySetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SanitySetupError';
  }
}

export function getSanityClient(preview = false) {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  if (!projectId || !dataset) {
    throw new SanitySetupError('Sanity project configuration is missing.');
  }
  if (projectId !== SANITY_PROJECT_ID || dataset !== SANITY_DATASET) {
    throw new SanitySetupError('Sanity is configured for a different project or dataset.');
  }

  const token = preview ? process.env.SANITY_API_READ_TOKEN : undefined;
  if (preview && !token) {
    throw new SanitySetupError('A server-only Sanity read token is required for draft preview.');
  }

  return createClient({
    projectId,
    dataset,
    apiVersion: SANITY_API_VERSION,
    useCdn: !preview,
    perspective: preview ? 'drafts' : 'published',
    ...(token ? { token } : {}),
  });
}
