"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ambient hero background clip.
 *
 * The clip is decorative, so it must never cost the homepage anything: it is
 * fetched only once the page has gone idle, it stops decoding as soon as the
 * hero scrolls away, and reduced-motion visitors get the still poster instead.
 */
/** How strongly the clip reads through the page background. Raising this past
 *  ~0.7 starts to cost headline contrast on the clip's brightest frame. */
const CLIP_OPACITY = 0.7;

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Defer the fetch until after first paint so ~650KB of decoration never
  // competes with the headline for bandwidth. Reduced motion => poster only.
  // Phones => poster only too: a decoding background video behind everything
  // else on the hero is a real scroll/battery cost, and at phone size the
  // still poster is visually near-identical.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 639px)").matches) return;

    const idle = window.requestIdleCallback;
    if (idle) {
      const id = idle(() => setEnabled(true), { timeout: 2000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setEnabled(true), 500);
    return () => clearTimeout(t);
  }, []);

  // Pause once the hero is off-screen — a background video that keeps decoding
  // while you read the pricing table is pure battery drain on a phone.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  return (
    <div className="absolute inset-x-0 top-0 h-[680px] sm:h-[820px] overflow-hidden hero-clip-mask">
      {/* Poster underlay: shows instantly, and is the whole thing for
          reduced-motion visitors. */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
        style={{
          backgroundImage: "url(/hero-bg-poster.jpg)",
          opacity: playing ? 0 : CLIP_OPACITY,
        }}
      />

      {enabled && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/hero-bg-poster.jpg"
          aria-hidden="true"
          onPlaying={() => setPlaying(true)}
          className="w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: playing ? CLIP_OPACITY : 0 }}
        >
          <source src="/hero-bg.webm" type="video/webm" />
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
      )}

      {/* Scrim: holds the headline readable through the clip's brightest frame
          and blends the clip out into the page background. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#06060a]/55 via-[#06060a]/25 to-[#06060a]" />
    </div>
  );
}
