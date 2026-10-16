// app/page.tsx

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/products/ProductCard";
import { getFeaturedProducts } from "@/lib/products";
import { siteConfig } from "@/lib/site-config";

export default function HomePage() {
  const featured = getFeaturedProducts(3);

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-neutral-200">
        <Container className="py-24 sm:py-32">
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            Independent product studio
          </p>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-neutral-900 sm:text-6xl">
            Ideas into products.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600">
            {siteConfig.name} builds useful tools, digital experiences, and
            applications for people and businesses — across whatever
            categories the ideas demand.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/products"
              className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Explore Products
            </Link>
            <Link
              href="/about"
              className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400"
            >
              About Persifix
            </Link>
          </div>
        </Container>
      </section>

      {/* Featured products */}
      <section className="border-b border-neutral-200">
        <Container className="py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Featured products
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Selected from the current portfolio.
              </p>
            </div>
            <Link
              href="/products"
              className="hidden shrink-0 text-sm font-medium text-neutral-900 hover:text-neutral-600 sm:inline"
            >
              View all →
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-xl border border-dashed border-neutral-300 p-12 text-center">
              <p className="text-sm text-neutral-500">
                Persifix is currently developing its first products.
              </p>
            </div>
          )}
        </Container>
      </section>

      {/* Philosophy */}
      <section className="border-b border-neutral-200">
        <Container className="py-20">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
              We build what we believe should exist.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-neutral-600">
              Every product in this studio starts as a specific idea about
              something that should work better, be simpler, or simply exist
              where nothing did before. We take those ideas through design,
              engineering, and release — and each product keeps its own
              purpose, audience, and identity.
            </p>
            <p className="mt-4 text-base leading-relaxed text-neutral-600">
              Some will be small utilities. Others may become substantial
              businesses. All of them are built and operated by Persifix.
            </p>
          </div>
        </Container>
      </section>

      {/* Explore portfolio */}
      <section>
        <Container className="py-20">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Explore the portfolio
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Every product Persifix has released, in one place.
              </p>
            </div>
            <Link
              href="/products"
              className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400"
            >
              Browse all products
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}