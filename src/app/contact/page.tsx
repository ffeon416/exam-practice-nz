"use client";

import { useState } from "react";
import Link from "next/link";

type FormState = "idle" | "sending" | "success" | "error";

export default function ContactPage() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("sending");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      type: fd.get("type") as string,
      message: fd.get("message") as string,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setFormState("error");
        return;
      }

      // FormSubmit email notification — fired from the browser so it comes
      // from the real user IP (Cloudflare blocks server-side calls from
      // Vercel's data-center IPs). This is best-effort — the /api/contact
      // above is what guarantees the message is stored.
      fetch("https://formsubmit.co/ajax/ffeon.io@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `[${payload.type || "general"}] New message from ${payload.name}`,
          name: payload.name,
          email: payload.email,
          type: payload.type || "general",
          message: payload.message,
        }),
      }).catch(() => {});

      setFormState("success");
    } catch {
      setErrorMsg("Failed to send. Please try again.");
      setFormState("error");
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <section className="max-w-2xl mx-auto px-5 pt-6 sm:pt-16 pb-16 sm:pb-20">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 mb-6">
            <svg
              className="w-3.5 h-3.5 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            Get in touch
          </div>
          <h1 className="text-[24px] sm:text-[40px] md:text-[48px] font-extrabold text-white tracking-tight leading-tight mb-3 sm:mb-4">
            Contact us
          </h1>
          <p className="text-zinc-400 text-[15px] sm:text-[17px] max-w-lg mx-auto leading-relaxed">
            Question, feedback, or just want to say hi? We&apos;d love to hear
            from you.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-8">
          {formState === "success" ? (
            <div className="rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-[17px] mb-2">
                Message sent!
              </h3>
              <p className="text-zinc-400 text-[13px]">
                We&apos;ll get back to you as soon as we can.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-zinc-400 text-[13px] font-medium mb-1.5"
                >
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                  placeholder="Your name"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-zinc-400 text-[13px] font-medium mb-1.5"
                >
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                  placeholder="you@example.com"
                />
              </div>

              {/* Type */}
              <div>
                <label
                  htmlFor="type"
                  className="block text-zinc-400 text-[13px] font-medium mb-1.5"
                >
                  What&apos;s this about?
                </label>
                <select
                  id="type"
                  name="type"
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  <option value="general" className="bg-[#0a0a0f]">
                    General question
                  </option>
                  <option value="feedback" className="bg-[#0a0a0f]">
                    Feedback or suggestion
                  </option>
                  <option value="bug" className="bg-[#0a0a0f]">
                    Report a problem
                  </option>
                  <option value="billing" className="bg-[#0a0a0f]">
                    Billing or subscription
                  </option>
                  <option value="school" className="bg-[#0a0a0f]">
                    School or teacher enquiry
                  </option>
                  <option value="other" className="bg-[#0a0a0f]">
                    Other
                  </option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-zinc-400 text-[13px] font-medium mb-1.5"
                >
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-zinc-600 resize-y"
                  placeholder="How can we help?"
                />
              </div>

              {errorMsg && (
                <p className="text-red-400 text-[13px]">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={formState === "sending"}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3 rounded-lg transition-all text-[14px] disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                {formState === "sending" ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </div>

        {/* Alternative contact */}
        <div className="mt-10 text-center">
          <p className="text-zinc-500 text-[13px] mb-2">
            Prefer email?
          </p>
          <a
            href="mailto:ffeon.io@gmail.com"
            className="text-indigo-400 hover:text-indigo-300 text-[14px] font-medium transition-colors"
          >
            ffeon.io@gmail.com
          </a>
          <p className="text-zinc-500 text-[13px] mt-6 mb-2">
            Or hang out with us
          </p>
          <a
            href="https://discord.gg/3sGUANx7uW"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 text-[14px] font-medium transition-colors"
          >
            Join the StudyAce Discord &rarr;
          </a>
        </div>

        {/* Links */}
        <div className="mt-10 flex flex-wrap justify-center gap-4 text-[13px]">
          <Link
            href="/schools"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            For schools &amp; teachers &rarr;
          </Link>
          <Link
            href="/pricing"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Pricing &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
