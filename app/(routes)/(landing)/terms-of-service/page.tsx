import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-4xl py-16">
      <h1 className="text-4xl font-bold">Terms of Service</h1>

      <p className="mt-4 text-muted-foreground">Last updated: June 2026</p>

      <section className="mt-12 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Acceptance of Terms</h2>
          <p className="mt-3 text-muted-foreground">
            By accessing or using Syntragent, you agree to be bound by these
            Terms of Service. If you do not agree with any part of these terms,
            you may not access or use the platform.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">About Syntragent</h2>
          <p className="mt-3 text-muted-foreground">
            Syntragent is an AI-powered social media scheduling and content
            management platform that helps users create, organize, schedule, and
            publish content across supported social media platforms.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Account Registration</h2>
          <p className="mt-3 text-muted-foreground">
            You are responsible for maintaining the security of your account and
            any credentials associated with it. You agree to provide accurate
            information and keep your account details up to date.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Social Media Integrations</h2>
          <p className="mt-3 text-muted-foreground">
            Syntragent integrates with third-party platforms such as Instagram,
            Facebook, Threads, X (Twitter), and other supported services. Access
            to these services is governed by their respective terms and
            policies.
          </p>

          <p className="mt-3 text-muted-foreground">
            By connecting your accounts, you authorize Syntragent to access and
            manage the permissions required to provide scheduling and publishing
            functionality.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">User Content</h2>
          <p className="mt-3 text-muted-foreground">
            You retain ownership of all content you create, upload, schedule, or
            publish through Syntragent. You are solely responsible for ensuring
            your content complies with applicable laws and platform policies.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Prohibited Uses</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Violating applicable laws or regulations.</li>
            <li>Posting harmful, abusive, fraudulent, or illegal content.</li>
            <li>Attempting unauthorized access to Syntragent systems.</li>
            <li>Disrupting platform functionality or security.</li>
            <li>Using automated methods to abuse the service.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">AI Features</h2>
          <p className="mt-3 text-muted-foreground">
            Syntragent may provide AI-generated suggestions, captions, content,
            or recommendations. AI-generated output may be inaccurate or
            incomplete, and users are responsible for reviewing all generated
            content before publication.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Payments & Billing</h2>
          <p className="mt-3 text-muted-foreground">
            Certain features may require a paid subscription. Fees are billed
            according to the pricing plan selected by the user. Subscription
            fees are non-refundable except where required by law.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Service Availability</h2>
          <p className="mt-3 text-muted-foreground">
            We strive to maintain reliable service but do not guarantee
            uninterrupted availability. Features may be modified, suspended, or
            discontinued at any time.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Limitation of Liability</h2>
          <p className="mt-3 text-muted-foreground">
            To the maximum extent permitted by law, Syntragent shall not be
            liable for indirect, incidental, consequential, or special damages
            arising from your use of the platform.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Termination</h2>
          <p className="mt-3 text-muted-foreground">
            We may suspend or terminate access to the platform if these Terms
            are violated or if continued access presents a security or legal
            risk.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Changes to These Terms</h2>
          <p className="mt-3 text-muted-foreground">
            We may update these Terms of Service from time to time. Continued
            use of Syntragent after changes become effective constitutes
            acceptance of the revised terms.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p className="mt-3 text-muted-foreground">
            If you have questions about these Terms, please contact:
          </p>

          <p className="mt-3">
            <a href="mailto:stephenpelagio1797@gmail.com" className="underline">
              stephenpelagio1797@gmail.com
            </a>
          </p>
        </div>
      </section>

      <div className="mt-12 border-t pt-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Syntragent
        </Link>
      </div>
    </div>
  );
}
