import { draftMode } from 'next/headers';
import { NextResponse } from 'next/server';
import { getContentRevision } from '@/src/cms/revision';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function responseHeaders(): HeadersInit {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    Vary: 'Cookie',
  };
}

export async function GET(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if ((origin && origin !== requestOrigin) || fetchSite === 'cross-site') {
    return NextResponse.json({ error: 'Same-origin preview access is required.' }, { status: 403, headers: responseHeaders() });
  }

  if (!(await draftMode()).isEnabled) {
    return NextResponse.json({ error: 'Draft mode is required.' }, { status: 401, headers: responseHeaders() });
  }

  try {
    const revision = await getContentRevision(true);
    return NextResponse.json({ rev: revision }, { headers: responseHeaders() });
  } catch {
    return NextResponse.json({ error: 'Content revisions are unavailable.' }, { status: 503, headers: responseHeaders() });
  }
}
