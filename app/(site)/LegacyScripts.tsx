"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __netproLegacyScriptsPromise?: Promise<void>;
    __netproLegacyScriptsLoaded?: Set<string>;
  }
}

const legacyScripts = [
  "/assets/vendor/gsap.min.js",
  "/assets/vendor/ScrollTrigger.min.js",
  "/enquiry-state.js?v=20261013-enquiry1",
  "/app.js?v=20261015-whatsapp3",
  "/navigation-motion.js?v=5",
  "/motion.js?v=1",
  "/home-process.js?v=2",
  "/home-sections.js?v=4",
];

function appendScript(src: string): Promise<void> {
  if (window.__netproLegacyScriptsLoaded?.has(src)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.netproLegacy = "true";
    script.addEventListener("load", () => {
      window.__netproLegacyScriptsLoaded ??= new Set();
      window.__netproLegacyScriptsLoaded.add(src);
      resolve();
    }, { once: true });
    script.addEventListener("error", () => {
      script.remove();
      reject(new Error(`Unable to load ${src}`));
    }, { once: true });
    document.body.appendChild(script);
  });
}

async function loadLegacyScriptsOnce() {
  if (!window.__netproLegacyScriptsPromise) {
    const promise = (async () => {
      for (const src of legacyScripts) await appendScript(src);
    })();
    window.__netproLegacyScriptsPromise = promise;
    void promise.catch(() => {
      if (window.__netproLegacyScriptsPromise === promise) {
        window.__netproLegacyScriptsPromise = undefined;
      }
    });
  }

  return window.__netproLegacyScriptsPromise;
}

export default function LegacyScripts() {
  useEffect(() => {
    void loadLegacyScriptsOnce().catch((error: unknown) => {
      console.error("Netpro homepage scripts failed to load.", error);
    });
  }, []);

  return null;
}
