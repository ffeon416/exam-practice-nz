import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Reverse-proxy PostHog through our own domain so ad/tracker blockers can't
  // drop the analytics + session-replay requests (they block us.i.posthog.com
  // directly). The browser only ever talks to studyace.co/ingest/*.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
};

export default nextConfig;
