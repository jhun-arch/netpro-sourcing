import { CHECKOUT_REDIRECT_ROUTE, SITE_PAGE_MANIFEST } from "./src/fullsite/pageManifest";
import { NextResponse, type NextRequest } from "next/server";

const PASS_THROUGH_PREFIXES = ["/api", "/studio", "/_next", "/assets", "/data"] as const;
const PASS_THROUGH_ROOTS = new Set([
  "/",
  "/index.html",
  "/privacy-policy",
  "/terms",
]);

const KNOWN_PAGE_PATHS = new Set<string>([
  ...SITE_PAGE_MANIFEST.map((page) => page.route),
  CHECKOUT_REDIRECT_ROUTE.route,
]);

function hasProtectedPrefix(pathname: string): boolean {
  return PASS_THROUGH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

function fileExtension(pathname: string): string | undefined {
  const segment = pathname.split("/").at(-1) || "";
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Keep the encoded segment; the extension check below remains conservative.
  }
  return /\.([a-z0-9]+)$/i.exec(decoded)?.[1]?.toLowerCase();
}

export function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return;

  const pathname = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
  if (hasProtectedPrefix(pathname) || PASS_THROUGH_ROOTS.has(pathname) || KNOWN_PAGE_PATHS.has(pathname)) return;

  const extension = fileExtension(pathname);
  if (extension && extension !== "html") return;

  const destination = new URL("/api/not-found-page", request.url);
  destination.search = "";
  destination.hash = "";
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: "/((?!api(?:/|$)|studio(?:/|$)|_next(?:/|$)|assets(?:/|$)|data(?:/|$)|.*\\.(?:js|css|ico|png|jpe?g|webp|svg|woff2?|json)$).*)",
};
