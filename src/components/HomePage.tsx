import type { ReactNode } from 'react';
import { draftMode } from 'next/headers';
import { getHomePageData, HomeContentError } from '../cms/home';
import { SanitySetupError } from '../cms/client';
import { getContentRevision } from '../cms/revision';
import { getCatalogData } from '../catalog/catalog';
import CatalogBootstrap from '../catalog/CatalogBootstrap';
import { getSiteSettingsData } from '../fullsite/content';
import { applySiteHeaderSettings } from '../fullsite/shared';
import { LEGACY_HOME_BODY_HTML } from './legacyHomeTemplate';
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
    const [data, catalog, revision, settings] = await Promise.all([
      getHomePageData(preview),
      getCatalogData(preview),
      preview ? getContentRevision(true, 'home') : Promise.resolve(''),
      getSiteSettingsData(preview),
    ]);
    return (
      <>
        <CatalogBootstrap data={catalog} />
        {renderHome(data, applySiteHeaderSettings(LEGACY_HOME_BODY_HTML, settings, preview))}
        {preview ? (
          <>
            <PreviewRefresh revision={revision} pageKey="home" />
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
