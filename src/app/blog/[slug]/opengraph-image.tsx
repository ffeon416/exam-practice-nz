import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog";

// Per-post social card: title + category on the studyace dark gradient, so a
// shared link shows the article rather than the generic site card.
export const alt = "StudyAce blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.title ?? "The Exam Strategy Playbook";
  const category = post?.category ?? "StudyAce Blog";
  const meta = post ? `${post.readingTime} · ${category}` : category;
  const fontSize = title.length > 90 ? 44 : title.length > 60 ? 52 : 62;

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, lineHeight: 1 }}>
            <span style={{ color: "#ffffff" }}>study</span>
            <span style={{ color: "#818cf8" }}>ace</span>
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(129, 140, 248, 0.12)",
              border: "1px solid rgba(129, 140, 248, 0.3)",
              fontSize: 22,
              fontWeight: 500,
              color: "#c7d2fe",
            }}
          >
            {meta}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize,
            fontWeight: 800,
            lineHeight: 1.12,
            color: "#ffffff",
            maxWidth: 1000,
          }}
        >
          {title}
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
