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

test("unknown single and nested GET/HEAD requests rewrite to the same-origin 404 handler", () => {
  for (const path of [
    "/this-page-does-not-exist.html?campaign=ignored",
    "/nested/missing/page",
    "/nested/missing/page.html?campaign=ignored",
  ]) {
    for (const method of ["GET", "HEAD"]) {
      const incoming = request(path, method);
      const response = proxy(incoming);

      assert.ok(response, method + " " + path + " should be rewritten");
      assert.equal(isRewrite(response), true);
      assert.equal(response.status, 200, "the Route Handler, not Proxy, supplies the 404 status");
      assert.equal(getRewrittenUrl(response), origin + "/api/not-found-page", "the rewrite target is same-origin and clears the query string");
      assert.equal(incoming.nextUrl.pathname, new URL(path, origin).pathname, "the browser-facing URL stays unchanged");
    }
  }
});

test("registered pages, aliases, root, API, Studio, and protected prefixes pass through", () => {
  const passThroughPaths = [
    "/",
    ...SITE_PAGE_MANIFEST.map((page) => page.route),
    CHECKOUT_REDIRECT_ROUTE.route,
    "/index.html",
    "/privacy-policy",
    "/terms",
    "/studio",
    "/studio/structure",
    "/api",
    "/api/contact",
    "/_next/static/chunks/app.js",
    "/assets/example.webp",
    "/data/example.json",
  ];

  for (const path of passThroughPaths) {
    assert.equal(proxy(request(path)), undefined, path + " must reach its existing route or handler");
  }
});

test("all non-HTML static root extensions bypass the 404 fallback", () => {
  const manifest = JSON.parse(readFileSync(new URL("../scripts/legacy-public-manifest.json", import.meta.url), "utf8")) as { files: string[] };
  for (const filename of ["styles.css", "custom-products.js"]) {
    assert.ok(existsSync(new URL("../" + filename, import.meta.url)), filename + " source must exist");
    assert.ok(manifest.files.includes(filename), filename + " must be registered for public asset sync");
    assert.equal(proxy(request("/" + filename)), undefined, filename + " must remain a static asset");
  }
  for (const path of ["/favicon.ico", "/font.woff2", "/manifest.webmanifest", "/source.map", "/data.xml", "/image.avif"]) {
    assert.equal(proxy(request(path)), undefined, path + " must remain a static asset");
  }
});

test("only page GET/HEAD requests are intercepted, and protected prefixes have path boundaries", () => {
  for (const method of ["POST", "OPTIONS", "PUT"]) {
    assert.equal(proxy(request("/missing.html", method)), undefined, method + " must pass through");
  }
  assert.ok(proxy(request("/apiary")), "a similarly named page is not the /api prefix");
  assert.ok(proxy(request("/studio-preview")), "a similarly named page is not the /studio prefix");
  assert.equal(config.matcher.includes("_next(?:/|$)"), true);
  assert.equal(config.matcher.includes("api(?:/|$)"), true);
});
