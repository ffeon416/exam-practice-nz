import { ImageResponse } from "next/og";

export const alt = "StudyAce — Master NCEA Exams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          background:
            "radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.35), transparent 55%), radial-gradient(circle at 75% 80%, rgba(168, 85, 247, 0.28), transparent 55%), #06060a",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, system-ui, Segoe UI, Helvetica, Arial, sans-serif",
          color: "#ffffff",
          letterSpacing: "-0.03em",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 132,
            fontWeight: 800,
            lineHeight: 1,
            marginBottom: 40,
          }}
        >
          <span style={{ color: "#ffffff" }}>study</span>
          <span style={{ color: "#818cf8" }}>ace</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 54,
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Master NCEA Exams
        </div>

        {/* Sub-tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 400,
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Unlimited practice papers · AI marking · Built for NZ Y10–Y13
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 20px",
            borderRadius: 999,
            background: "rgba(129, 140, 248, 0.12)",
            border: "1px solid rgba(129, 140, 248, 0.3)",
            fontSize: 22,
            fontWeight: 500,
            color: "#c7d2fe",
          }}
        >
          <span style={{ display: "flex", width: 8, height: 8, borderRadius: 999, background: "#818cf8" }} />
          studyace.co
        </div>
      </div>
    ),
    { ...size }
  );
}
