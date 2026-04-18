"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import type { Grade } from "@/lib/types";

interface ShareResultCardProps {
  subject: string;
  level: number;
  grade: Grade;
  totalMarks: number;
  maxMarks: number;
  examTitle: string;
}

const GRADE_COLORS: Record<Grade, string> = {
  excellence: "#facc15",
  merit: "#60a5fa",
  achieved: "#4ade80",
  "not-achieved": "#f87171",
};

const GRADE_LABELS: Record<Grade, string> = {
  excellence: "Excellence",
  merit: "Merit",
  achieved: "Achieved",
  "not-achieved": "Not Achieved",
};

function formatSubject(subject: string): string {
  return subject
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ShareResultCard({
  subject,
  level,
  grade,
  totalMarks,
  maxMarks,
  examTitle,
}: ShareResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const pct = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;
  const gradeColorHex = GRADE_COLORS[grade];
  const gradeText = GRADE_LABELS[grade];
  const subjectLabel = formatSubject(subject);
  const levelLabel = level > 0 ? `Level ${level} ${subjectLabel}` : subjectLabel;
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `studyace-${subject}-result.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setSharing(false);
          return;
        }
        const file = new File([blob], "studyace-result.png", {
          type: "image/png",
        });
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "My NCEA Result — StudyAce",
            });
          }
        } catch {
          // user cancelled or share failed — ignore
        } finally {
          setSharing(false);
        }
      }, "image/png");
    } catch {
      setSharing(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-300 text-sm font-medium hover:bg-white/[0.07] transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0-12.814a2.25 2.25 0 1 0 0-2.186m0 2.186a2.25 2.25 0 1 0 0 2.186"
          />
        </svg>
        Share your result
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card preview */}
      <div className="flex justify-center overflow-x-auto">
        <div
          ref={cardRef}
          id="share-card"
          className="shrink-0"
          style={{
            width: 600,
            height: 600,
            background: "linear-gradient(180deg, #0a0a0f 0%, #12121f 100%)",
            position: "relative",
            overflow: "hidden",
            borderRadius: 16,
          }}
        >
          {/* Top indigo gradient line */}
          <div
            style={{
              height: 4,
              width: "100%",
              background: "linear-gradient(90deg, #6366f1 0%, #818cf8 50%, #6366f1 100%)",
            }}
          />

          {/* Header row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "32px 40px 0 40px",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: "#ffffff" }}>
              study<span style={{ color: "#818cf8" }}>ace</span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#71717a",
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              NCEA Practice Exam
            </div>
          </div>

          {/* Center content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 100,
            }}
          >
            {/* Grade */}
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: gradeColorHex,
                lineHeight: 1.1,
              }}
            >
              {gradeText}
            </div>

            {/* Score */}
            <div
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: "#ffffff",
                marginTop: 16,
              }}
            >
              {totalMarks}/{maxMarks} marks
            </div>

            {/* Percentage */}
            <div
              style={{
                fontSize: 20,
                color: "#a1a1aa",
                marginTop: 8,
              }}
            >
              ({pct}%)
            </div>

            {/* Subject pill */}
            <div
              style={{
                marginTop: 32,
                padding: "8px 24px",
                borderRadius: 999,
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                fontSize: 16,
                fontWeight: 600,
                color: "#a5b4fc",
              }}
            >
              {levelLabel}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: 28,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 13,
              color: "#52525b",
              fontWeight: 500,
            }}
          >
            studyace.co.nz
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 py-2.5 px-5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-300 text-sm font-medium hover:bg-white/[0.07] transition-colors disabled:opacity-50"
        >
          {downloading ? (
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.25"
              />
              <path
                d="M4 12a8 8 0 018-8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          )}
          Download
        </button>

        {canShare && (
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 py-2.5 px-5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-300 text-sm font-medium hover:bg-white/[0.07] transition-colors disabled:opacity-50"
          >
            {sharing ? (
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  opacity="0.25"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0-12.814a2.25 2.25 0 1 0 0-2.186m0 2.186a2.25 2.25 0 1 0 0 2.186"
                />
              </svg>
            )}
            Share
          </button>
        )}

        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-2 py-2.5 px-5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-400 text-sm font-medium hover:bg-white/[0.07] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
