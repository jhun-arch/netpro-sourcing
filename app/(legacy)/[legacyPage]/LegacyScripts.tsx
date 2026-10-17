"use client";

import { useEffect } from "react";
import type { LegacyScript } from "../../../src/fullsite/templateRenderer";

/** Load the source page scripts only after React has hydrated its fixed DOM tree. */
export default function LegacyScripts({ scripts }: { scripts: LegacyScript[] }) {
  useEffect(() => {
    let cancelled = false;
    const inserted: HTMLScriptElement[] = [];

    const loadInSourceOrder = async () => {
      for (const entry of scripts) {
        if (cancelled) return;
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = entry.src;
          script.async = false;
          if (entry.defer) script.defer = true;
          if (entry.type) script.type = entry.type;
          script.dataset.legacyPageScript = "true";
          script.addEventListener("load", () => resolve(), { once: true });
          script.addEventListener("error", () => {
            console.error(`Unable to load legacy page script: ${entry.src}`);
            resolve();
          }, { once: true });
          inserted.push(script);
          document.body.appendChild(script);
        });
      }
    };

    void loadInSourceOrder();
    return () => {
      cancelled = true;
      inserted.forEach((script) => script.remove());
    };
  }, [scripts]);

  return null;
}
