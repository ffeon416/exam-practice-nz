import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://studyace.co";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/sign-in",
          "/sign-up",
          "/welcome",
          "/profile",
          "/practice",
          "/review",
          "/plan",
          "/subjects",
          "/exam",
          "/refer",
          "/switch",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
