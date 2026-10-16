// app/products/page.tsx

import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/products/ProductCard";
import { getPublishedProducts } from "@/lib/products";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Products",
  description: `Every product released by ${siteConfig.name}.`,
};

export default function ProductsPage() {
  const products = getPublishedProducts();

  return (
    <main>
      <section className="border-b border-neutral-200">
        <Container className="py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            Portfolio
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            Products by {siteConfig.name}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600">
            Everything the studio has released, is developing, or has publicly
            announced.
          </p>
        </Container>
      </section>

      <section>
        <Container className="py-16">
          {products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-300 p-16 text-center">
              <h2 className="text-base font-medium text-neutral-900">
                No products yet
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Persifix is currently developing its first products.
              </p>
            </div>
          )}
        </Container>
      </section>
    </main>
  );
}