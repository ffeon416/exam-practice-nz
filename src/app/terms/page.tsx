import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | StudyAce",
  description:
    "The terms that apply when you use StudyAce — NCEA exam practice for New Zealand students.",
};

const LAST_UPDATED = "22 April 2026";
const CONTACT_EMAIL = "ffeon.io@gmail.com";

export default function TermsPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-12 sm:pt-16 pb-20">
        <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-zinc-500 text-[13px] mb-10">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="space-y-8">
          <Section title="Agreement">
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) form a binding
              agreement between you and StudyAce (&ldquo;we&rdquo;,
              &ldquo;us&rdquo;). By creating an account or using
              studyace.co (&ldquo;the Service&rdquo;), you agree to these
              Terms and our{" "}
              <a href="/privacy" className="text-indigo-400 hover:text-indigo-300 transition-colors">Privacy Policy</a>.
              If you don&apos;t agree, please don&apos;t use the Service.
            </p>
          </Section>

          <Section title="Who can use the Service">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You must be at least <strong className="text-zinc-300">13 years old</strong> to create an account.</li>
              <li>If you are under 18, you confirm that a parent or guardian has read these Terms and agreed to them on your behalf, and consents to you using the Service and paying for any subscription (if applicable).</li>
              <li>Teachers and schools may use the Service for their own students subject to a written school agreement.</li>
              <li>You may only hold one personal account. Accounts are not transferable.</li>
            </ul>
          </Section>

          <Section title="What the Service does">
            <p>
              StudyAce is an online NCEA practice platform for New Zealand
              secondary school students (Years 10–13). It includes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>AI-generated practice exam papers and questions</li>
              <li>AI-powered marking and written feedback on your answers</li>
              <li>A personal tutor chat that guides you through questions</li>
              <li>Study progress tracking, spaced repetition review, and study plans</li>
            </ul>
            <p className="mt-3">
              The Service is <strong className="text-zinc-300">not affiliated with or endorsed by NZQA</strong>.
              Our content is designed to prepare you in the style of real NZQA papers, but it is not official NZQA material.
            </p>
          </Section>

          <Section title="Your account">
            <p>You agree to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Provide accurate information when signing up.</li>
              <li>Keep your password secure and not share your account with others.</li>
              <li>Tell us immediately if you believe your account has been compromised (email <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">{CONTACT_EMAIL}</a>).</li>
              <li>Take responsibility for all activity that happens on your account.</li>
            </ul>
          </Section>

          <Section title="Acceptable use">
            <p>You may only use the Service for personal study. You must not:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Use it during an actual NZQA examination, internal assessment, or anywhere it would breach your school&apos;s academic integrity rules.</li>
              <li>Submit AI-generated answers as your own work in any school assessment.</li>
              <li>Scrape, copy, re-host, or redistribute StudyAce&apos;s exam content, marking schemes, or tutor responses.</li>
              <li>Attempt to reverse-engineer, bypass rate limits, or interfere with the Service.</li>
              <li>Share, resell, or transfer your account.</li>
              <li>Use the Service for any unlawful purpose, or to generate content that is harmful, deceptive, or infringes the rights of others.</li>
            </ul>
            <p className="mt-3">
              We may suspend or terminate accounts that breach these rules.
              If abuse is severe or intentional, we may also report it to your
              school or the relevant authorities.
            </p>
          </Section>

          <Section title="AI-generated content">
            <p>
              Exam questions, marking, feedback, and tutor chat responses are
              produced by artificial intelligence (models provided by
              Anthropic). While we take accuracy seriously and calibrate
              against real NZQA standards, AI can occasionally make mistakes.
            </p>
            <p>
              Use StudyAce as a practice and learning tool — not as the final
              authority on how a real NZQA marker would grade your answer.
              Always cross-check important facts with official NZQA study
              guides or your teacher.
            </p>
          </Section>

          <Section title="Subscriptions, pricing, and refunds">
            <p>
              StudyAce offers a free tier and two paid subscription tiers
              (&ldquo;Student&rdquo; and &ldquo;Pro&rdquo;). Paid
              subscriptions are billed through Stripe.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Subscriptions renew automatically at the end of each billing period (monthly or yearly) until cancelled.</li>
              <li>You can cancel any time from your account billing page. Cancellation takes effect at the end of the current billing period — you keep access until then.</li>
              <li><strong className="text-zinc-300">30-day money-back guarantee on Pro</strong> — if you subscribe to Pro and want a refund within 30 days of your first payment, email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">{CONTACT_EMAIL}</a> and we&apos;ll refund the most recent Pro payment, no questions asked.</li>
              <li>Outside of the Pro 30-day guarantee, we don&apos;t offer refunds for partial months, yearly subscriptions beyond the guarantee window, or unused portions of a subscription.</li>
              <li>Prices are shown in NZD. We may change pricing with reasonable notice; any change will only affect billing cycles that start after the notice period.</li>
              <li>All prices include GST where applicable.</li>
            </ul>
          </Section>

          <Section title="Consumer rights (NZ)">
            <p>
              Nothing in these Terms excludes, restricts, or modifies any
              guarantee, right, or remedy you have under the{" "}
              <strong className="text-zinc-300">Consumer Guarantees Act 1993</strong> or the{" "}
              <strong className="text-zinc-300">Fair Trading Act 1986</strong> that cannot be lawfully excluded.
              If you use the Service for business purposes, you agree that
              those Acts do not apply to the extent permitted by law.
            </p>
          </Section>

          <Section title="Service availability">
            <p>
              We work hard to keep StudyAce online and fast, but we cannot
              promise 100% uptime. The Service may be unavailable from time to
              time due to maintenance, outages at our service providers (Clerk,
              Supabase, Anthropic, Stripe, Vercel), or factors outside our
              control. We will try to give notice for planned downtime where
              we can.
            </p>
          </Section>

          <Section title="Intellectual property">
            <p>
              The StudyAce platform — including its design, code, branding,
              curated content, and AI-generated exam library — is owned by
              us. You may not reproduce, distribute, or create derivative
              works from the platform without our written permission.
            </p>
            <p>
              You keep ownership of the answers you write. By submitting an
              answer, you grant us a limited, non-exclusive licence to
              process it so we can mark it, give you feedback, and improve
              your personalised study data. We do not use your answers to
              train AI models.
            </p>
          </Section>

          <Section title="Suspension and termination">
            <p>
              You can delete your account any time from your profile page.
              We can suspend or terminate your account if you materially
              breach these Terms, misuse the Service, or if we&apos;re legally
              required to. Where possible we&apos;ll warn you first.
            </p>
            <p>
              If we terminate your paid subscription for breach, we will not
              refund any remaining period. If you terminate under the 30-day
              Pro guarantee, see the refunds section above.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              The Service is provided &ldquo;as is&rdquo;. To the maximum
              extent permitted by New Zealand law (and subject to the
              Consumer Guarantees Act where it applies):
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>We are not responsible for your exam results or academic outcomes.</li>
              <li>We are not liable for occasional errors in AI-generated content, marking, or feedback.</li>
              <li>We are not liable for any indirect, incidental, or consequential loss arising from your use of the Service.</li>
              <li>Our total liability to you for any claim is limited to the amount you have paid us for the Service in the 12 months before the claim arose.</li>
            </ul>
          </Section>

          <Section title="Changes to these Terms">
            <p>
              We may update these Terms from time to time. If the changes are
              material, we&apos;ll notify you by email or a clear notice on the
              Service before they take effect. Continuing to use the Service
              after the change takes effect means you accept the updated
              Terms. If you don&apos;t agree, you can cancel your subscription
              and delete your account.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These Terms are governed by the laws of New Zealand. Any
              disputes are subject to the exclusive jurisdiction of the New
              Zealand courts.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions, feedback, refund requests, or anything else — email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-white font-semibold text-[17px] mb-3">{title}</h2>
      <div className="text-zinc-400 text-[14px] leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
