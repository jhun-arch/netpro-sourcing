import type { Metadata } from 'next';
import { getLegacyNotFoundData, getLegacyNotFoundMetadata, renderGlobalLegacyNotFoundDocument } from './(legacy)/LegacyNotFound';

export async function generateMetadata(): Promise<Metadata> {
  return getLegacyNotFoundMetadata();
}

export default async function GlobalNotFound() {
  return renderGlobalLegacyNotFoundDocument(await getLegacyNotFoundData());
}
