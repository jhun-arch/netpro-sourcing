import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CHECKOUT_REDIRECT_ROUTE, findSitePageByRoute, SITE_PAGE_MANIFEST } from "../../../src/fullsite/pageManifest";
import { getSitePageData, getSitePageMetadata } from "../../../src/fullsite/content";
import { getLegacyPageShell } from "../../../src/fullsite/templateRenderer";
import { connection } from "next/server";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...SITE_PAGE_MANIFEST.map(({ route }) => ({ legacyPage: route.slice(1) })),
    { legacyPage: CHECKOUT_REDIRECT_ROUTE.route.slice(1) },
  ];
}

async function pageForPath(legacyPage: string) {
  return findSitePageByRoute(`/${legacyPage}`);
}

export async function generateMetadata({ params }: { params: Promise<{ legacyPage: string }> }): Promise<Metadata> {
  const { legacyPage } = await params;
  if (legacyPage === CHECKOUT_REDIRECT_ROUTE.route.slice(1)) {
    return { robots: { index: false, follow: false, noarchive: true } };
  }
  const entry = await pageForPath(legacyPage);
  const fallbackEntry = entry ?? SITE_PAGE_MANIFEST.find((page) => page.pageKey === "404")!;
  await connection();
  const [page] = await Promise.all([getSitePageData(fallbackEntry.pageKey)]);
  return getSitePageMetadata(page, fallbackEntry.route, getLegacyPageShell(fallbackEntry.pageKey).metadata);
}

export default async function LegacyRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ legacyPage: string }>;
}) {
  const { legacyPage } = await params;
  if (legacyPage === CHECKOUT_REDIRECT_ROUTE.route.slice(1)) redirect(CHECKOUT_REDIRECT_ROUTE.destination);

  const entry = await pageForPath(legacyPage);
  const shell = getLegacyPageShell((entry ?? SITE_PAGE_MANIFEST.find((page) => page.pageKey === "404")!).pageKey);
  return (
    <html lang={shell.htmlLang}>
      <head dangerouslySetInnerHTML={{ __html: shell.headHtml }} />
      <body className={shell.bodyClass}>{children}</body>
    </html>
  );
}
