import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="container max-w-4xl py-16">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="mt-3 text-muted-foreground">Last updated: June 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-7">
          <section>
            <h2 className="text-xl font-semibold mb-3">Introduction</h2>
            <p className="text-muted-foreground">
              Syntragent ({`"we", "our", or "us"`}) provides AI-powered social
              media scheduling and content management tools. This Privacy Policy
              explains what information we collect, how we use it, and the
              choices available to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              Information We Collect
            </h2>

            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                Account information such as your name, email address, and
                profile details.
              </li>
              <li>
                Connected social media account information from platforms such
                as Instagram, Facebook, and Threads.
              </li>
              <li>
                Content you create, upload, schedule, or publish through our
                platform.
              </li>
              <li>
                Usage analytics, device information, browser information, and
                diagnostic data.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              Social Media Integrations
            </h2>

            <p className="text-muted-foreground">
              When you connect a social media account, Syntragent may receive
              information made available through the platform&apos;s API,
              including account identifiers, usernames, profile images, and
              permissions required to publish or manage content on your behalf.
            </p>

            <p className="text-muted-foreground mt-3">
              We only access information necessary to provide our services and
              do not post content without your authorization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              How We Use Information
            </h2>

            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and improve Syntragent services.</li>
              <li>Authenticate users and secure accounts.</li>
              <li>Schedule and publish social media content.</li>
              <li>Generate AI-powered content suggestions.</li>
              <li>Respond to support requests.</li>
              <li>Monitor platform performance and reliability.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              Data Storage & Security
            </h2>

            <p className="text-muted-foreground">
              We implement reasonable technical and organizational safeguards to
              protect your information from unauthorized access, disclosure,
              alteration, or destruction.
            </p>

            <p className="text-muted-foreground mt-3">
              While we strive to protect your information, no method of
              electronic transmission or storage is completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Third-Party Services</h2>

            <p className="text-muted-foreground">
              Syntragent relies on trusted third-party services including
              authentication providers, hosting providers, analytics services,
              payment processors, and social media platforms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data Retention</h2>

            <p className="text-muted-foreground">
              We retain information for as long as necessary to provide our
              services, comply with legal obligations, resolve disputes, and
              enforce agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Your Rights</h2>

            <p className="text-muted-foreground">
              You may request access to, correction of, or deletion of your
              personal information at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              Data Deletion Requests
            </h2>

            <p className="text-muted-foreground">
              If you would like your account and associated data removed, please
              submit a request by emailing:
            </p>

            <p className="mt-3">
              <a
                href="mailto:stephenpelagio1797@gmail.com"
                className="font-medium underline"
              >
                stephenpelagio1797@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact Us</h2>

            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, contact us at:
            </p>

            <p className="mt-3">
              <a
                href="mailto:stephenpelagio1797@gmail.com"
                className="font-medium underline"
              >
                stephenpelagio1797@gmail.com
              </a>
            </p>
          </section>

          <div className="border-t pt-6">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Syntragent
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
