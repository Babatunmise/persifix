// components/products/ProductCard.tsx

import Link from "next/link";
import type { Product } from "@/types/product";

/**
 * The one card component used everywhere a product appears.
 * Homepage featured section, /products directory, and anywhere else.
 * All data comes in via props — no product-specific logic here.
 */
export function ProductCard({ product }: { product: Product }) {
  const showStatusBadge = product.status === "coming-soon";

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-6 transition-all hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ProductLogo product={product} />
          <div>
            <h3 className="text-base font-semibold tracking-tight text-neutral-900">
              {product.name}
            </h3>
            <p className="text-xs text-neutral-500">{product.category}</p>
          </div>
        </div>

        {showStatusBadge && (
          <span className="shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
            Coming soon
          </span>
        )}
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-neutral-600">
        {product.shortDescription}
      </p>

      <span className="mt-6 text-sm font-medium text-neutral-900 transition-transform group-hover:translate-x-0.5">
        Learn more →
      </span>
    </Link>
  );
}

/**
 * Renders the product logo if present, otherwise a monogram tile.
 * Using accentColor when available so each product keeps its identity.
 */
function ProductLogo({ product }: { product: Product }) {
  if (product.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.logo}
        alt=""
        className="h-10 w-10 rounded-md object-cover"
      />
    );
  }

  const initials = product.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-semibold text-white"
      style={{ backgroundColor: product.accentColor ?? "#171717" }}
      aria-hidden
    >
      {initials}
    </div>
  );
}