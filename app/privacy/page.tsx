// app/privacy/page.tsx

import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} handles information.`,
};

export default function PrivacyPage() {
  return (
    <main>
      <section className="border-b border-neutral-200">
        <Container className="py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-neutral-500">
            Last updated: {siteConfig.currentYear}
          </p>
        </Container>
      </section>

      <section>
        <Container className="py-16">
          <div className="max-w-2xl space-y-6 text-base leading-relaxed text-neutral-700">
            <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              This page is a placeholder. It describes the current state of
              the {siteConfig.name} website accurately, but should be
              reviewed and expanded before any product collects user data.
            </p>

            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Information we collect
            </h2>
            <p>
              The {siteConfig.name} website does not collect personal
              information beyond what you choose to send us by email.
            </p>

            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Information you send us
            </h2>
            <p>
              If you contact us at{" "}
              <a
                href={`mailto:${siteConfig.email}`}
                className="text-neutral-900 underline-offset-4 hover:underline"
              >
                {siteConfig.email}
              </a>
              , we receive the contents of that message and your email
              address. We use it only to respond and to keep a record of the
              conversation.
            </p>

            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Individual products
            </h2>
            <p>
              Individual products operated by {siteConfig.name} may collect
              additional information as required by their functionality. Any
              such collection will be described in the privacy documentation
              of that product.
            </p>

            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Changes
            </h2>
            <p>
              This policy may be updated as {siteConfig.name} evolves. The
              current version will always be available at this URL.
            </p>
          </div>
        </Container>
      </section>
    </main>
  );
}