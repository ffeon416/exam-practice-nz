import type { MetadataRoute } from "next";

// Web App Manifest — makes StudyAce installable to the home screen and opens
// it full-screen (no browser chrome). Next auto-injects <link rel="manifest">.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudyAce — NCEA Practice Exams",
    short_name: "StudyAce",
    description:
      "Unlimited NCEA practice exams with instant marking. Built for NZ students from Year 10 to Year 13.",
    id: "/",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#06060a",
    theme_color: "#06060a",
    orientation: "portrait",
    categories: ["education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
