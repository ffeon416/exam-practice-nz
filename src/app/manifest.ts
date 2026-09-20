import type { MetadataRoute } from "next";

// Web App Manifest — makes StudyAce installable to the home screen and opens
// it full-screen (no browser chrome). Next auto-injects <link rel="manifest">.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudyAce",
    short_name: "StudyAce",
    description:
      "Unlimited exam-style practice, marked honestly, with a plan to your target grade.",
    id: "/",
    start_url: "/today",
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
