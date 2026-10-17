import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server";
import { getRewrittenUrl, isRewrite } from "next/experimental/testing/server";
import { config, proxy } from "../proxy";
import { CHECKOUT_REDIRECT_ROUTE, SITE_PAGE_MANIFEST } from "../src/fullsite/pageManifest";

const origin = "https://netpro.example.test";

function request(path: string, method = "GET") {
  return new NextRequest(new URL(path, origin), { method });
}

test("unknown single-segment GET and HEAD requests transparently render CMS 404 with status 404", () => {
  for (const method of ["GET", "HEAD"]) {
    const incoming = request("/this-page-does-not-exist.html?campaign=ignored", method);
    const response = proxy(incoming);

    assert.ok(response, `${method} should be rewritten`);
    assert.equal(isRewrite(response), true);
    assert.equal(response.status, 404);
    assert.equal(getRewrittenUrl(response), `${origin}/404.html`, "the rewrite target must be same-origin and have no query string");
    assert.equal(incoming.nextUrl.pathname, "/this-page-does-not-exist.html", "the browser-facing URL stays unchanged");
  }
});

test("all registered full-site routes and explicit app paths pass through", () => {
  const knownPagePaths = [
    ...SITE_PAGE_MANIFEST.map((page) => page.route),
    CHECKOUT_REDIRECT_ROUTE.route,
  ];
  const passThroughPaths = [
    ...knownPagePaths,
    "/index.html",
    "/privacy-policy",
    "/terms",
    "/studio",
    "/api",
    "/_next",
  ];

  for (const path of passThroughPaths) {
    assert.equal(proxy(request(path)), undefined, `${path} must reach its existing route or redirect`);
  }
});

test("real public root assets bypass the page fallback", () => {
  const manifest = JSON.parse(readFileSync(new URL("../scripts/legacy-public-manifest.json", import.meta.url), "utf8")) as { files: string[] };
  for (const filename of ["styles.css", "custom-products.js"]) {
    assert.ok(existsSync(new URL(`../${filename}`, import.meta.url)), `${filename} source must exist`);
    assert.ok(manifest.files.includes(filename), `${filename} must be registered for public asset sync`);
    assert.equal(proxy(request(`/${filename}`)), undefined, `${filename} must remain a static asset`);
  }
  assert.equal(proxy(request("/favicon.ico")), undefined, "non-HTML asset extensions pass through even when served by framework metadata");
});

test("non-page methods and nested unknown paths are not intercepted", () => {
  assert.equal(proxy(request("/missing.html", "POST")), undefined);
  assert.equal(proxy(request("/missing.html", "OPTIONS")), undefined);
  assert.equal(proxy(request("/nested/missing/page")), undefined);
  assert.equal(config.matcher, "/:legacyPage", "the Proxy matcher must remain limited to one root segment");
});
