import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The old 3-question demo was retired 2026-09-20; the free grade check
      // is the one try-before-you-buy path. Old links, ads and indexed URLs
      // land there instead of a 404.
      { source: "/demo", destination: "/grade", permanent: true },
      { source: "/demo/:path*", destination: "/grade", permanent: true },
      // /practice was an 8-line redirect page; retired 2026-09-20.
      { source: "/practice", destination: "/subjects", permanent: true },
      // No sign-up page since 2026-09-20: accounts are created after paying.
      { source: "/sign-up", destination: "/pricing", permanent: false },
      { source: "/sign-up/:path*", destination: "/pricing", permanent: false },
    ];
  },
};

export default nextConfig;
