import { ImageResponse } from "next/og";

// Social card for the blog index itself. Per-post cards live in
// [slug]/opengraph-image.tsx; this one is what /blog shows when shared.
export const alt = "StudyAce — The Exam Strategy Playbook";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "radial-gradient(circle at 20% 15%, rgba(99, 102, 241, 0.35), transparent 55%), radial-gradient(circle at 85% 85%, rgba(168, 85, 247, 0.25), transparent 55%), #06060a",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, system-ui, Segoe UI, Helvetica, Arial, sans-serif",
          color: "#ffffff",
          letterSpacing: "-0.02em",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, lineHeight: 1 }}>
          <span style={{ color: "#ffffff" }}>study</span>
          <span style={{ color: "#818cf8" }}>ace</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.08 }}>
            The Exam Strategy Playbook
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#a1a1aa", marginTop: 22, lineHeight: 1.35 }}>
            Practice-based study methods for NCEA and beyond. Written for students, not academics.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 24,
            fontWeight: 500,
            color: "#a1a1aa",
          }}
        >
          <span style={{ display: "flex", width: 10, height: 10, borderRadius: 999, background: "#818cf8" }} />
          studyace.co/blog · Honest practice for every exam system
        </div>
      </div>
    ),
    { ...size }
  );
}
