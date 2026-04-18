import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | StudyAce",
};

export default function PrivacyPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-12 sm:pt-16 pb-20">
        <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-zinc-500 text-[13px] mb-10">
          Last updated: 17 April 2026
        </p>

        <div className="space-y-8">
          <Section title="Who we are">
            <p>
              StudyAce is an online exam practice platform for New Zealand NCEA students.
              We are based in New Zealand and operate the website at studyace.co.nz.
            </p>
            <p>
              If you have any questions about this policy, contact us at{" "}
              <a href="mailto:ffeon.io@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                ffeon.io@gmail.com
              </a>.
            </p>
          </Section>

          <Section title="What we collect">
            <p>We collect the following information:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li><strong className="text-zinc-300">Account information</strong> — your name and email address when you sign up (managed by Clerk, our authentication provider)</li>
              <li><strong className="text-zinc-300">Exam data</strong> — your practice exam answers, results, grades, and study progress</li>
              <li><strong className="text-zinc-300">Contact form submissions</strong> — your name, email, and message when you contact us</li>
              <li><strong className="text-zinc-300">School enquiries</strong> — school name, role, and contact details when a teacher enquires</li>
              <li><strong className="text-zinc-300">Payment information</strong> — processed securely by Stripe; we never see or store your card details</li>
            </ul>
          </Section>

          <Section title="How we use your data">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To provide the exam practice service — generating exams, marking answers, tracking your progress</li>
              <li>To personalise your experience — adaptive difficulty, study plans, spaced repetition</li>
              <li>To respond to your contact form messages and school enquiries</li>
              <li>To process payments for paid subscriptions</li>
              <li>To improve the service — we may analyse anonymised, aggregated usage patterns</li>
            </ul>
            <p className="mt-3">
              We do <strong className="text-zinc-300">not</strong> sell your data to third parties.
              We do <strong className="text-zinc-300">not</strong> use your data for advertising.
            </p>
          </Section>

          <Section title="Third-party services">
            <p>We use the following services to operate StudyAce:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li><strong className="text-zinc-300">Clerk</strong> — authentication and account management</li>
              <li><strong className="text-zinc-300">Supabase</strong> — database for storing exam data and progress</li>
              <li><strong className="text-zinc-300">Anthropic (Claude AI)</strong> — exam generation and answer marking</li>
              <li><strong className="text-zinc-300">Stripe</strong> — payment processing</li>
              <li><strong className="text-zinc-300">Vercel</strong> — website hosting</li>
              <li><strong className="text-zinc-300">Resend</strong> — email notifications</li>
            </ul>
            <p className="mt-3">
              Each of these services has their own privacy policy. Your data is only shared with them
              to the extent necessary to provide the service.
            </p>
          </Section>

          <Section title="Data storage">
            <p>
              Some data (exam progress, study plans, review queues) is stored locally in your browser
              using localStorage. This data stays on your device and is not sent to our servers unless
              you have cross-device sync enabled.
            </p>
            <p>
              Server-side data is stored in Supabase (hosted in the cloud). Account data is managed by Clerk.
              Payment data is managed by Stripe.
            </p>
          </Section>

          <Section title="Students under 18">
            <p>
              StudyAce is designed for secondary school students, many of whom are under 18.
              We collect only the minimum data necessary to provide the service.
              We do not knowingly collect data beyond what is described in this policy.
            </p>
            <p>
              If you are a parent or guardian and believe your child has provided us with personal
              information you are concerned about, please contact us and we will delete it.
            </p>
          </Section>

          <Section title="Your rights">
            <p>Under the New Zealand Privacy Act 2020, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent for data processing</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{" "}
              <a href="mailto:ffeon.io@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                ffeon.io@gmail.com
              </a>.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              We use essential cookies only — for authentication (Clerk session cookies) and
              site functionality. We do not use tracking cookies, analytics cookies, or
              advertising cookies.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this policy from time to time. If we make significant changes,
              we will notify you via the website. The &ldquo;last updated&rdquo; date at the top
              of this page shows when this policy was last changed.
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
