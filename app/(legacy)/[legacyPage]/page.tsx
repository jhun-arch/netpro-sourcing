import { notFound, redirect } from "next/navigation";
import CatalogBootstrap from "../../../src/catalog/CatalogBootstrap";
import { getCatalogData } from "../../../src/catalog/catalog";
import { getContentRevision } from "../../../src/cms/revision";
import { SanitySetupError } from "../../../src/cms/client";
import DraftVisualEditing from "../../../src/components/DraftVisualEditing";
import PreviewRefresh from "../../../src/components/PreviewRefresh";
import { getSitePageData, getSiteSettingsData, isSitePreviewEnabled } from "../../../src/fullsite/content";
import { CHECKOUT_REDIRECT_ROUTE, findSitePageByRoute } from "../../../src/fullsite/pageManifest";
import { getLegacyScripts, renderLegacyPageBody, requiresCatalogBootstrap } from "../../../src/fullsite/templateRenderer";
import LegacyScripts from "./LegacyScripts";

export default async function LegacyPage({ params }: { params: Promise<{ legacyPage: string }> }) {
  const { legacyPage } = await params;
  if (legacyPage === CHECKOUT_REDIRECT_ROUTE.route.slice(1)) redirect(CHECKOUT_REDIRECT_ROUTE.destination);
  const entry = findSitePageByRoute(`/${legacyPage}`);
  if (!entry) notFound();

  const preview = await isSitePreviewEnabled();
  const [page, settings] = await Promise.all([
    getSitePageData(entry.pageKey, preview),
    getSiteSettingsData(preview),
  ]);

  const sourceScripts = getLegacyScripts(entry.pageKey);
  const hasCatalogConsumer = requiresCatalogBootstrap(entry.pageKey);
  let catalogData = null;
  let useCatalog = false;
  if (hasCatalogConsumer) {
    try {
      catalogData = await getCatalogData(preview);
      useCatalog = true;
    } catch (error) {
      if (preview || !(error instanceof SanitySetupError)) throw error;
    }
  }
  const scripts = useCatalog
    ? getLegacyScripts(entry.pageKey, { catalogBootstrap: true })
    : sourceScripts;
  const revision = preview ? await getContentRevision(true) : null;

  return (
    <>
      {useCatalog && catalogData ? <CatalogBootstrap data={catalogData} /> : null}
      {preview ? <><PreviewRefresh revision={revision ?? ""} /><DraftVisualEditing /></> : null}
      {renderLegacyPageBody(entry.pageKey, page, settings, preview)}
      <LegacyScripts scripts={scripts} />
    </>
  );
}
