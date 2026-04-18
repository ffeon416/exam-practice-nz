import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | StudyAce",
};

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
          Last updated: 18 April 2026
        </p>

        <div className="space-y-8">
          <Section title="Acceptance of terms">
            <p>
              By accessing or using StudyAce (&ldquo;the Service&rdquo;), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, do not use the Service.
            </p>
            <p>
              If you are under 18, you represent that your parent or guardian has reviewed and
              agreed to these terms on your behalf.
            </p>
          </Section>

          <Section title="Description of service">
            <p>
              StudyAce is an online platform that provides NCEA practice exams for New Zealand
              secondary school students. The Service includes AI-generated exam questions,
              AI-powered answer marking, study progress tracking, spaced repetition review,
              and personalised study plans.
            </p>
          </Section>

          <Section title="Account responsibilities">
            <p>When you create an account, you agree to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Provide accurate and truthful information</li>
              <li>Keep your password secure and not share it with others</li>
              <li>Notify us immediately if you believe your account has been compromised</li>
              <li>Be responsible for all activity that occurs under your account</li>
            </ul>
          </Section>

          <Section title="Acceptable use">
            <p>You agree to use the Service only for personal study purposes. You must not:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Use the Service to cheat in actual NZQA examinations or assessments</li>
              <li>Submit AI-generated answers as your own work in school assessments</li>
              <li>Scrape, copy, or redistribute exam content from the Service</li>
              <li>Attempt to reverse-engineer, exploit, or interfere with the Service</li>
              <li>Use the Service for any unlawful purpose</li>
              <li>Share your account with others or create multiple accounts</li>
            </ul>
          </Section>

          <Section title="AI-generated content disclaimer">
            <p>
              Exam questions, marking, feedback, and worked solutions on StudyAce are generated
              by artificial intelligence. While we strive for accuracy, AI-generated content may
              contain errors or inaccuracies.
            </p>
            <p>
              StudyAce is <strong className="text-zinc-300">not</strong> affiliated with or endorsed
              by NZQA. Our practice exams are designed to help you prepare, but they are not
              official NZQA examination papers. Grades and marks given by our AI marker are
              indicative only and may not reflect the grade you would receive in an actual exam.
            </p>
          </Section>

          <Section title="Payments and subscriptions">
            <p>
              StudyAce offers both free and paid subscription tiers. Paid subscriptions are
              processed securely through Stripe.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Subscriptions renew automatically at the end of each billing period</li>
              <li>You can cancel your subscription at any time from your account settings</li>
              <li>Cancellation takes effect at the end of your current billing period</li>
              <li>We do not offer refunds for partial months or unused portions of a subscription</li>
              <li>We reserve the right to change pricing with reasonable notice</li>
            </ul>
          </Section>

          <Section title="Intellectual property">
            <p>
              The StudyAce platform, including its design, code, and AI-generated exam content,
              is owned by us. You may not reproduce, distribute, or create derivative works from
              the platform without our written permission.
            </p>
            <p>
              You retain ownership of your own answers and any content you submit through the
              Service. By using the Service, you grant us a limited licence to process your
              answers for the purpose of providing marking and feedback.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              StudyAce is provided &ldquo;as is&rdquo; without warranties of any kind. To the
              maximum extent permitted by New Zealand law:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>We are not responsible for your exam outcomes or academic results</li>
              <li>We are not liable for any errors in AI-generated content, marking, or feedback</li>
              <li>We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service</li>
              <li>Our total liability to you shall not exceed the amount you have paid us in the preceding 12 months</li>
            </ul>
          </Section>

          <Section title="Changes to these terms">
            <p>
              We may update these terms from time to time. If we make significant changes,
              we will notify you via the website or by email. Your continued use of the Service
              after changes are posted constitutes acceptance of the updated terms.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These terms are governed by the laws of New Zealand. Any disputes arising from
              these terms or the Service shall be subject to the exclusive jurisdiction of the
              New Zealand courts.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              If you have questions about these terms, contact us at{" "}
              <a href="mailto:ffeon.io@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                ffeon.io@gmail.com
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
