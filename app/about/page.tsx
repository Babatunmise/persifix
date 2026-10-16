// app/about/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About",
  description: `What ${siteConfig.name} is, and how it works.`,
};

export default function AboutPage() {
  return (
    <main>
      <section className="border-b border-neutral-200">
        <Container className="py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            About
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            An independent product studio.
          </h1>
        </Container>
      </section>

      <section className="border-b border-neutral-200">
        <Container className="py-16">
          <div className="max-w-2xl space-y-6 text-base leading-relaxed text-neutral-700">
            <p>
              {siteConfig.name} turns ideas into products. It exists to build
              things that should exist — tools, applications, utilities, and
              digital experiences that solve specific problems for specific
              audiences.
            </p>
            <p>
              It is not a company that sells one kind of software. It is a
              studio that develops products across whatever categories the
              ideas demand — healthcare, productivity, AI, creative tools,
              developer utilities, and beyond.
            </p>
            <p>
              Every product begins as an idea, goes through design and
              engineering, and is released to the people who find it useful.
              Some will become substantial businesses. Others will remain
              small, focused tools. All of them are built and operated by{" "}
              {siteConfig.name}.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-b border-neutral-200">
        <Container className="py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
            How we work
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Principle
              title="Develop"
              body="Turn ideas into working products, not slide decks. Ship real functionality."
            />
            <Principle
              title="Release"
              body="Put products in front of the people they're built for. Learn from evidence."
            />
            <Principle
              title="Improve"
              body="Iterate on what works. Retire what doesn't. Keep the studio moving forward."
            />
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-16">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                See what we've built
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                The current portfolio of {siteConfig.name} products.
              </p>
            </div>
            <Link
              href="/products"
              className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Explore Products
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold tracking-tight text-neutral-900">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">{body}</p>
    </div>
  );
}