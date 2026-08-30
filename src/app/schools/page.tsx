"use client";

import { useState, type FormEvent } from "react";
import { display } from "@/lib/displayFont";

export default function SchoolsPage() {
  const [formState, setFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("loading");
    setErrorMessage("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      school: (form.elements.namedItem("school") as HTMLInputElement).value,
      role: (form.elements.namedItem("role") as HTMLSelectElement).value || undefined,
      students: (form.elements.namedItem("students") as HTMLSelectElement).value || undefined,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value || undefined,
    };

    try {
      const res = await fetch("/api/school-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        setErrorMessage(body.error || "Something went wrong. Please try again.");
        setFormState("error");
        return;
      }

      // Client-side FormSubmit notification — see contact page for rationale.
      fetch("https://formsubmit.co/ajax/ffeon.io@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `New school enquiry from ${data.name} at ${data.school}`,
          name: data.name,
          email: data.email,
          school: data.school,
          role: data.role || "—",
          students: data.students || "—",
          message: data.message || "—",
        }),
      }).catch(() => {});

      setFormState("success");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setFormState("error");
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(50% 50% at 50% 42%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }}
        />
      </div>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-5 pt-6 sm:pt-20 pb-10 sm:pb-24 text-center">
        <div className="home-rise inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          For teachers &amp; schools
        </div>

        <h1
          className={`${display.className} home-rise text-[32px] sm:text-[52px] md:text-[60px] font-bold text-white tracking-[-0.02em] leading-[1.1] sm:leading-[1.05] mb-4 sm:mb-6`}
          style={{ animationDelay: "80ms", textWrap: "balance" }}
        >
          Bring StudyAce to
          <br />
          <em className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
            your classroom
          </em>
        </h1>

        <p
          className="home-rise text-zinc-400 text-[14px] sm:text-[16px] md:text-[18px] leading-relaxed max-w-xl mx-auto mb-8 sm:mb-10 px-2"
          style={{ animationDelay: "160ms" }}
        >
          Bulk pricing for NCEA practice. Give your students unlimited exam
          reps with instant marking — across every subject, every level.
        </p>

        <div className="home-rise flex flex-col sm:flex-row gap-3 justify-center" style={{ animationDelay: "240ms" }}>
          <a
            href="#contact"
            className="group rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 font-extrabold text-white px-8 py-3.5 transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/30 text-[15px] inline-flex items-center justify-center gap-2 min-h-[44px]"
          >
            Enquire for your school
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
          <a
            href="#how-it-works"
            className="text-zinc-300 hover:text-white font-semibold px-8 py-3.5 rounded-full border border-white/[0.12] hover:border-white/[0.3] hover:bg-white/[0.04] transition-all text-[15px] inline-flex items-center justify-center min-h-[44px]"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* BENEFITS GRID */}
      <section className="max-w-5xl mx-auto px-5 pb-12 sm:pb-24">
        <div className="text-center mb-8 sm:mb-12">
          <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider mb-3">Why teachers love it</p>
          <h2 className={`${display.className} text-[22px] sm:text-[36px] md:text-[40px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
            Built for the classroom
          </h2>
          <p className="text-zinc-500 text-[15px] max-w-lg mx-auto">
            Less marking, more teaching. Better data, better outcomes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <BenefitCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3M3.75 21h16.5M16.5 3.75h.008v.008H16.5V3.75z" />
              </svg>
            }
            title="Covers the whole syllabus"
            desc="Every NCEA standard, every level. Unlimited fresh NCEA-style practice across 19 subjects."
          />
          <BenefitCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="Students self-mark"
            desc="Every answer gets detailed feedback and worked solutions instantly. No marking pile on your desk — students practise between your classes, not during them."
          />
          <BenefitCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            }
            title="Aligned to NCEA standards"
            desc="Questions follow NCEA exam style and difficulty. Covers all 19 subjects from Year 10 through Level 3."
          />
          <BenefitCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
              </svg>
            }
            title="Students actually use it"
            desc="Streaks, progress tracking, and adaptive difficulty keep students coming back. Built for how teens actually study."
          />
          <BenefitCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
              </svg>
            }
            title="Works on any device"
            desc="Phone, tablet, laptop, Chromebook — no app to install, no IT setup required. Students just open a browser."
          />
          <BenefitCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            }
            title="Bulk pricing for classes"
            desc="Discounted licenses for whole classes, departments, or the full school. Get in touch and we’ll work out a plan that fits your budget."
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-5 pb-12 sm:pb-24">
        <div className="text-center mb-8 sm:mb-12">
          <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider mb-3">How it works</p>
          <h2 className={`${display.className} text-[22px] sm:text-[36px] md:text-[40px] font-bold text-white tracking-[-0.02em]`} style={{ textWrap: "balance" }}>
            Simple for schools
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Step
            number="01"
            title="Get in touch"
            desc="Tell us about your school and what you’re teaching. We’ll come back with a plan that fits your budget."
          />
          <Step
            number="02"
            title="Students train"
            desc="Students sign up, pick their subjects, and start training on exam-style papers straight away."
          />
          <Step
            number="03"
            title="Exam day ready"
            desc="By exam time your students have trained on the actual format dozens of times. They walk in knowing what to expect."
          />
        </div>
      </section>

      {/* STATS BAR */}
      <section className="max-w-4xl mx-auto px-5 pb-10 sm:pb-24">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 font-mono text-[12px] text-zinc-500 tracking-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold">19</span> subjects
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold">Years 10&ndash;13</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold">Instant</span> StudyAce marking
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold">100+</span> exam papers
          </div>
        </div>
      </section>

      {/* SCHOOLS CTA */}
      <section className="max-w-4xl mx-auto px-5 pb-10 sm:pb-24">
        <div className="text-center mb-8 sm:mb-12">
          <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider mb-3">Join us</p>
          <h2 className={`${display.className} text-[22px] sm:text-[36px] md:text-[40px] font-bold text-white tracking-[-0.02em]`} style={{ textWrap: "balance" }}>
            Be an early adopter
          </h2>
        </div>

        <div className="rounded-[32px] border border-white/[0.07] bg-white/[0.015] p-8 text-center">
          <p className="text-zinc-400 text-[15px] mb-4">
            We&apos;re working with schools across New Zealand to bring StudyAce to their students.
          </p>
          <p className="text-zinc-300 text-[14px] font-medium">
            Want to be one of the first? Get in touch below.
          </p>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section id="contact" className="max-w-2xl mx-auto px-5 pb-16 sm:pb-24">
        <div className="text-center mb-8 sm:mb-10">
          <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider mb-3">Get started</p>
          <h2 className={`${display.className} text-[22px] sm:text-[36px] md:text-[40px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
            Talk to us about your school
          </h2>
          <p className="text-zinc-500 text-[15px] max-w-lg mx-auto">
            Tell us about your school. We&apos;ll come back with the right plan for you.
          </p>
        </div>

        <div className="rounded-[32px] border border-white/[0.07] bg-white/[0.015] p-4 sm:p-8">
          {formState === "success" ? (
            <div className="rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-[17px] mb-2">Thanks for your interest!</h3>
              <p className="text-zinc-400 text-[13px]">We&apos;ve received your enquiry and will be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-zinc-400 text-[13px] font-medium mb-1.5">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-zinc-400 text-[13px] font-medium mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                  placeholder="you@school.nz"
                />
              </div>

              <div>
                <label htmlFor="school" className="block text-zinc-400 text-[13px] font-medium mb-1.5">
                  School name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="school"
                  name="school"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                  placeholder="e.g. Mount Maunganui College"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="role" className="block text-zinc-400 text-[13px] font-medium mb-1.5">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors"
                    defaultValue=""
                  >
                    <option value="" disabled className="text-zinc-600 bg-[#0a0a0f]">Select your role</option>
                    <option value="Teacher" className="bg-[#0a0a0f]">Teacher</option>
                    <option value="Head of Department" className="bg-[#0a0a0f]">Head of Department</option>
                    <option value="Deputy Principal" className="bg-[#0a0a0f]">Deputy Principal</option>
                    <option value="Principal" className="bg-[#0a0a0f]">Principal</option>
                    <option value="Other" className="bg-[#0a0a0f]">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="students" className="block text-zinc-400 text-[13px] font-medium mb-1.5">
                    Number of students
                  </label>
                  <select
                    id="students"
                    name="students"
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors"
                    defaultValue=""
                  >
                    <option value="" disabled className="text-zinc-600 bg-[#0a0a0f]">Select range</option>
                    <option value="1-30" className="bg-[#0a0a0f]">1-30</option>
                    <option value="31-100" className="bg-[#0a0a0f]">31-100</option>
                    <option value="101-300" className="bg-[#0a0a0f]">101-300</option>
                    <option value="300+" className="bg-[#0a0a0f]">300+</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-zinc-400 text-[13px] font-medium mb-1.5">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-zinc-600 resize-none"
                  placeholder="Tell us about how you'd like to use StudyAce..."
                />
              </div>

              {formState === "error" && errorMessage && (
                <p className="text-red-400 text-[13px]">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={formState === "loading"}
                className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed font-extrabold text-white px-8 py-3.5 transition-all hover:scale-[1.01] shadow-lg shadow-indigo-500/30 text-[15px] min-h-[48px]"
              >
                {formState === "loading" ? "Sending..." : "Send enquiry"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4 sm:p-5 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 mb-4 group-hover:bg-indigo-500/15 transition-colors">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-[15px] mb-1.5">{title}</h3>
      <p className="text-zinc-500 text-[13px] leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-[14px] mb-4 shadow-lg shadow-indigo-500/30">
        {number}
      </div>
      <h3 className="text-white font-semibold text-[17px] mb-2">{title}</h3>
      <p className="text-zinc-500 text-[13px] leading-relaxed">{desc}</p>
    </div>
  );
}

