import { CHECKOUT_REDIRECT_ROUTE, SITE_PAGE_MANIFEST } from "./src/fullsite/pageManifest";
import { NextResponse, type NextRequest } from "next/server";

const NOT_FOUND_PAGE = "/404.html";

export function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return;

  const pathname = request.nextUrl.pathname;
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length !== 1) return;

  const rootPath = `/${segments[0]}`;
  const passThroughPaths = [
    "/index.html",
    "/privacy-policy",
    "/terms",
    "/studio",
    "/api",
    "/_next",
  ];
  if (passThroughPaths.includes(rootPath)) return;

  const knownPagePaths: readonly string[] = [
    ...SITE_PAGE_MANIFEST.map((page) => page.route),
    CHECKOUT_REDIRECT_ROUTE.route,
  ];
  if (knownPagePaths.includes(rootPath)) return;

  const hasExtension = /\.[^/.]+$/.test(rootPath);
  if (hasExtension && !rootPath.toLowerCase().endsWith(".html")) return;

  const destination = new URL(NOT_FOUND_PAGE, request.url);
  destination.search = "";
  return NextResponse.rewrite(destination, { status: 404 });
}

export const config = {
  matcher: "/:legacyPage",
};
