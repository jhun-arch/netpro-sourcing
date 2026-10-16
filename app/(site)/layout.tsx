import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../../styles.css";
import "../../typography.css";
import "../../b2b.css";
import "../../motion.css";
import "../../services.css";
import "../../refinements.css";
import "../../home-studio.css";
import "../../home-sections.css";
import "../../newbuttons.css";
import "../../site-footer.css";
import "../../link-motion.css";
import LegacyScripts from "./LegacyScripts";

export const metadata: Metadata = {
  title: "Netpro Sourcing",
  icons: {
    icon: "/assets/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#426097",
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="home-page">
        {children}
        <LegacyScripts />
      </body>
    </html>
  );
}
