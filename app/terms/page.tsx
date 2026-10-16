// app/terms/page.tsx

import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms governing use of ${siteConfig.name}.`,
};

export default function TermsPage() {
  return (
    <main>
      <section className="border-b border-neutral-200">
        <Container className="py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            Terms of Use
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
              reviewed and expanded before any product requires contractual
              terms.
            </p>

            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Use of this website
            </h2>
            <p>
              This website is provided for informational purposes. You may
              browse it freely and share links to it.
            </p>

            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Individual products
            </h2>
            <p>
              Individual products operated by {siteConfig.name} may be
              governed by their own terms of service. Where such terms exist,
              they take precedence for that product.
            </p>

            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Intellectual property
            </h2>
            <p>
              Names, logos, product names, and content on this website are
              the property of {siteConfig.name} unless otherwise noted.
            </p>

            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Changes
            </h2>
            <p>
              These terms may be updated as {siteConfig.name} evolves. The
              current version will always be available at this URL.
            </p>
          </div>
        </Container>
      </section>
    </main>
  );
}