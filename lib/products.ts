// lib/products.ts

import { products } from "@/data/products";
import type { Product, ProductStatus } from "@/types/product";

/**
 * Statuses that are visible in the main directory by default.
 * Some can be overridden per-product via `publiclyVisible`.
 */
const PUBLIC_STATUSES: ProductStatus[] = ["live", "coming-soon"];

/**
 * Statuses whose product page resolves at /products/[slug]
 * even when the product is hidden from the directory.
 * Prevents previously published URLs from 404ing.
 */
const RESOLVABLE_STATUSES: ProductStatus[] = [
  "live",
  "coming-soon",
  "paused",
  "discontinued",
];

/**
 * Returns true if a product should appear in the public directory
 * and homepage featured section.
 */
export function isPubliclyVisible(product: Product): boolean {
  if (product.publiclyVisible === true) return true;
  return PUBLIC_STATUSES.includes(product.status);
}

/**
 * Returns true if the product page should resolve at /products/[slug].
 * Public visibility always implies resolvable.
 */
export function isResolvable(product: Product): boolean {
  if (isPubliclyVisible(product)) return true;
  return RESOLVABLE_STATUSES.includes(product.status);
}

/**
 * Sort helper — products with a lower displayOrder come first.
 * Products without a displayOrder sort to the end, alphabetically.
 */
function byDisplayOrder(a: Product, b: Product): number {
  const aOrder = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return a.name.localeCompare(b.name);
}

/**
 * All products that should appear in the public directory,
 * sorted by displayOrder. This is what /products renders.
 */
export function getPublishedProducts(): Product[] {
  return products.filter(isPubliclyVisible).sort(byDisplayOrder);
}

/**
 * The top N published products — used by the homepage featured section.
 */
export function getFeaturedProducts(limit = 3): Product[] {
  return getPublishedProducts().slice(0, limit);
}

/**
 * Look up a single product by slug.
 * Returns the product only if its page is allowed to resolve.
 * Returns null if not found or not resolvable — the page renders a 404.
 */
export function getProductBySlug(slug: string): Product | null {
  const product = products.find((p) => p.slug === slug);
  if (!product) return null;
  if (!isResolvable(product)) return null;
  return product;
}

/**
 * Every product slug that should be indexed by search engines.
 * Used by the future sitemap.
 */
export function getIndexableSlugs(): string[] {
  return products.filter(isPubliclyVisible).map((p) => p.slug);
}

/**
 * The primary destination for a product, if any.
 * Used to render the hero CTA on product pages and cards.
 */
export function getPrimaryDestination(product: Product) {
  return (
    product.destinations.find((d) => d.primary) ??
    product.destinations[0] ??
    null
  );
}