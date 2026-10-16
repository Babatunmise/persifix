// app/contact/page.tsx

import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${siteConfig.name}.`,
};

export default function ContactPage() {
  return (
    <main>
      <section className="border-b border-neutral-200">
        <Container className="py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            Contact
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            Get in touch.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600">
            Questions, feedback, or interest in a product — email is the
            fastest way to reach us.
          </p>
        </Container>
      </section>

      <section>
        <Container className="py-16">
          <div className="max-w-xl rounded-xl border border-neutral-200 p-8">
            <p className="text-sm uppercase tracking-widest text-neutral-500">
              Email
            </p>
            <a
              href={`mailto:${siteConfig.email}`}
              className="mt-3 block text-2xl font-semibold tracking-tight text-neutral-900 underline-offset-4 hover:underline"
            >
              {siteConfig.email}
            </a>
            <p className="mt-4 text-sm text-neutral-500">
              We typically respond within a few business days.
            </p>
          </div>
        </Container>
      </section>
    </main>
  );
}