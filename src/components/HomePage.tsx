import type { ReactNode } from 'react';
import { draftMode } from 'next/headers';
import { getHomePageData, HomeContentError } from '../cms/home';
import { SanitySetupError } from '../cms/client';
import DraftVisualEditing from './DraftVisualEditing';
import PreviewRefresh from './PreviewRefresh';
import { HomeRendererError, renderHome } from './renderHome';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function SetupMessage({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="home-setup-error" role="status" aria-live="polite">
      <h1>Homepage setup required</h1>
      <p>{children}</p>
    </main>
  );
}

export default async function HomePage() {
  const preview = (await draftMode()).isEnabled;

  try {
    const data = await getHomePageData(preview);
    return (
      <>
        {renderHome(data)}
        {preview ? (
          <>
            <PreviewRefresh revision={data._rev} />
            <DraftVisualEditing />
          </>
        ) : null}
      </>
    );
  } catch (error) {
    if (error instanceof SanitySetupError || error instanceof HomeContentError || error instanceof HomeRendererError) {
      return <SetupMessage>{error.message}</SetupMessage>;
    }
    return <SetupMessage>Homepage content could not be loaded. Check the Sanity configuration and published homePage document.</SetupMessage>;
  }
}
