import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | StudyAce",
  description:
    "How StudyAce collects, uses, and protects your personal information, in line with the New Zealand Privacy Act 2020.",
};

const LAST_UPDATED = "22 April 2026";
const CONTACT_EMAIL = "ffeon.io@gmail.com";

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
          Last updated: {LAST_UPDATED}
        </p>

        <div className="space-y-8">
          <Section title="Summary">
            <p>
              StudyAce is a New Zealand-based online NCEA practice platform for
              Year 10–13 students. This policy explains what personal
              information we collect, how we use it, who we share it with, how
              we protect it, and your rights under the{" "}
              <strong className="text-zinc-300">New Zealand Privacy Act 2020</strong>.
            </p>
            <p>
              In plain English: we collect the minimum we need to run the
              service, we never sell your data, and you can ask us to show you
              or delete what we hold about you at any time.
            </p>
          </Section>

          <Section title="Who we are">
            <p>
              StudyAce (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the
              website at <span className="text-zinc-300">studyace.co</span> and
              is based in New Zealand. We are the agency that collects and
              holds your personal information for the purposes of the Privacy
              Act 2020.
            </p>
            <p>
              <strong className="text-zinc-300">Privacy Officer contact:</strong>{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>

          <Section title="Information we collect">
            <p>We collect the following personal information:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>
                <strong className="text-zinc-300">Account information</strong> — your
                email address and (optionally) your first name when you sign
                up. Managed by Clerk, our authentication provider.
              </li>
              <li>
                <strong className="text-zinc-300">Study data</strong> — your
                practice exam answers, marks, grades, study plans, subject
                selections, and review history.
              </li>
              <li>
                <strong className="text-zinc-300">Usage data</strong> — the
                features you use, how often, and anonymised performance
                metrics used to keep the service fast and accurate.
              </li>
              <li>
                <strong className="text-zinc-300">Payment information</strong> —
                if you subscribe to a paid tier, Stripe processes your card on
                our behalf. We receive only a customer ID and subscription
                status. <strong>We never see or store your card details.</strong>
              </li>
              <li>
                <strong className="text-zinc-300">Messages you send us</strong> —
                the content of any contact form submission or email you send,
                including name, email, and message body.
              </li>
              <li>
                <strong className="text-zinc-300">School enquiries</strong> —
                school name, your role, and contact details if you enquire on
                behalf of a school.
              </li>
            </ul>
            <p className="mt-3">
              We do <strong className="text-zinc-300">not</strong> collect device
              fingerprints, advertising identifiers, or track you across other
              websites.
            </p>
          </Section>

          <Section title="How we use your information">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To provide the practice service — generating exams, marking answers, tracking progress, and running spaced-repetition review.</li>
              <li>To personalise your experience — adaptive difficulty, study plans, weak-topic suggestions.</li>
              <li>To operate paid subscriptions — processing payments, managing your tier, and supporting refunds.</li>
              <li>To respond to contact form messages and school enquiries.</li>
              <li>To keep the platform secure — detecting abuse, rate-limiting API calls, preventing account takeover.</li>
              <li>To improve the service — analysing anonymised usage patterns (e.g. which subjects are most used).</li>
              <li>To meet legal obligations — complying with tax, accounting, and privacy law in New Zealand.</li>
            </ul>
            <p className="mt-3">
              We will <strong className="text-zinc-300">not</strong> sell your
              data, share it with advertisers, or use it for marketing by third
              parties.
            </p>
          </Section>

          <Section title="Third parties who process your data">
            <p>
              We rely on a small number of trusted service providers to
              operate the platform. Each has their own privacy policy which
              governs how they handle your data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>
                <strong className="text-zinc-300">Clerk</strong> (USA) —
                authentication, account management, and transactional email
                (e.g. email verification, password resets).
              </li>
              <li>
                <strong className="text-zinc-300">Supabase</strong> (USA) —
                database for your study data, progress, and review queue.
              </li>
              <li>
                <strong className="text-zinc-300">Anthropic</strong> (USA) —
                AI exam generation, answer marking, and tutor chat. Your
                answers and questions are sent to Anthropic for processing but
                are not used to train their models under our API terms.
              </li>
              <li>
                <strong className="text-zinc-300">Stripe</strong> (USA, with NZ
                operations) — subscription billing and payment processing.
              </li>
              <li>
                <strong className="text-zinc-300">Vercel</strong> (USA) —
                website hosting and infrastructure.
              </li>
            </ul>
          </Section>

          <Section title="International data transfers (IPP 12)">
            <p>
              Most of our service providers store data on servers located
              outside New Zealand, primarily in the United States. When we
              transfer your information to an overseas provider, we are
              required by the Privacy Act 2020 (Information Privacy Principle
              12) to make sure that provider offers comparable privacy
              protections to New Zealand law.
            </p>
            <p>
              All the providers listed above contractually commit to
              enterprise-grade security and data protection standards
              (SOC 2 Type II, ISO 27001, or equivalent). If you are not
              comfortable with data being processed overseas, please do not
              use the service.
            </p>
          </Section>

          <Section title="How long we keep your data">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-zinc-300">Account data</strong> — kept while your account is active, and for up to 90 days after you delete it (so we can handle refund disputes and chargebacks).</li>
              <li><strong className="text-zinc-300">Study data</strong> — deleted when you delete your account.</li>
              <li><strong className="text-zinc-300">Payment records</strong> — kept for 7 years as required by IRD tax law.</li>
              <li><strong className="text-zinc-300">Contact form messages</strong> — kept for up to 2 years, then deleted.</li>
              <li><strong className="text-zinc-300">Local browser data</strong> — stored on your device only. Clearing your browser storage removes it instantly.</li>
            </ul>
          </Section>

          <Section title="Local storage on your device">
            <p>
              StudyAce stores some study data (exam progress, custom papers,
              review queue, study plan) in your browser&apos;s local storage so
              the site works quickly and continues to function if your
              internet drops briefly. This data stays on your device and is
              only synced to our server to back up your progress and let you
              pick up on another device.
            </p>
          </Section>

          <Section title="How we protect your data">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>All traffic to studyace.co is encrypted with TLS (HTTPS).</li>
              <li>Your password is managed by Clerk — we never see or store it. Passwords are hashed using industry-standard algorithms.</li>
              <li>Database access is restricted to authenticated server code via short-lived credentials; it is not exposed publicly.</li>
              <li>Payments are handled entirely by Stripe (PCI DSS Level 1 certified). Card data never touches our systems.</li>
              <li>Admin access is restricted to a short, named allowlist.</li>
            </ul>
          </Section>

          <Section title="Data breach notification">
            <p>
              If we become aware of a privacy breach that is likely to cause
              you serious harm, we will notify you and the Office of the
              Privacy Commissioner as required by the Privacy Act 2020,
              without unreasonable delay.
            </p>
          </Section>

          <Section title="Students, parents and guardians">
            <p>
              StudyAce is designed for NCEA students, many of whom are under
              18. We take extra care with younger users:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>We only collect what we need to run the service. We do not build marketing profiles of students.</li>
              <li>We don&apos;t knowingly sign up users under 13. If we discover a user is under 13, we will close the account and delete the data unless we hold verifiable consent from a parent or guardian.</li>
              <li>If you are under 16, we recommend reviewing this policy with a parent, guardian, or teacher before signing up.</li>
              <li>If you are a parent or guardian and are concerned about an account or data held by us, email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">{CONTACT_EMAIL}</a> and we will respond promptly.</li>
            </ul>
          </Section>

          <Section title="Your rights under the Privacy Act 2020">
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li><strong className="text-zinc-300">Access</strong> the personal information we hold about you.</li>
              <li><strong className="text-zinc-300">Request correction</strong> of any inaccurate information.</li>
              <li><strong className="text-zinc-300">Request deletion</strong> of your data (subject to the retention rules above for payments/tax).</li>
              <li><strong className="text-zinc-300">Withdraw consent</strong> for any processing that relies on it, and cancel your subscription.</li>
              <li><strong className="text-zinc-300">Export your data</strong> in a portable format.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">{CONTACT_EMAIL}</a>.
              We will respond within 20 working days, as required by law.
            </p>
          </Section>

          <Section title="Making a complaint">
            <p>
              If you believe we have mishandled your personal information,
              please contact us first so we can try to resolve it. If you
              remain unsatisfied, you have the right to make a complaint to
              the Office of the Privacy Commissioner:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Website: <a href="https://privacy.org.nz" className="text-indigo-400 hover:text-indigo-300 transition-colors">privacy.org.nz</a></li>
              <li>Phone: 0800 803 909</li>
              <li>Email: enquiries@privacy.org.nz</li>
            </ul>
          </Section>

          <Section title="Cookies and tracking">
            <p>
              We use essential cookies only — session cookies set by Clerk to
              keep you signed in, and a small amount of site-functionality
              storage. We do not use advertising cookies, cross-site
              tracking, or third-party analytics trackers beyond privacy-friendly
              aggregate traffic counts (Vercel Analytics, which does not use
              cookies or collect personal identifiers).
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this policy from time to time — typically to
              reflect new features, providers, or legal requirements. If we
              make material changes, we will notify signed-in users by email
              or by a prominent notice on the site before the change takes
              effect. The &ldquo;Last updated&rdquo; date above is always
              current.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy, or want to exercise your rights?
              Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                {CONTACT_EMAIL}
              </a>
              {" "}and we&apos;ll respond within 20 working days.
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
