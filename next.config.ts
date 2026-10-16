import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  async rewrites() {
    return [
      { source: "/privacy-policy", destination: "/privacy-policy.html" },
      { source: "/terms", destination: "/terms.html" },
    ];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/draft-mode/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
