// types/product.ts

/**
 * The lifecycle status of a product.
 * Controls public visibility via lib/products.ts — NOT whether the app is online.
 */
export type ProductStatus =
  | "idea"           // private, never public
  | "in-development" // private by default
  | "coming-soon"    // optionally public
  | "live"           // public
  | "paused"         // hidden from directory, page still resolves
  | "discontinued";  // hidden from directory, page still resolves

/**
 * Broad product type. Extensible — add new values as the studio grows.
 */
export type ProductType =
  | "saas"
  | "web-app"
  | "ai-tool"
  | "developer-tool"
  | "digital-product"
  | "consumer-app"
  | "creative-tool"
  | "professional-utility"
  | "mobile-app"
  | "other";

/**
 * Where a product can be accessed. A product may have one or many.
 */
export type DestinationPlatform =
  | "web"
  | "ios"
  | "android"
  | "macos"
  | "windows"
  | "chrome-extension"
  | "marketplace"
  | "other";

export interface ProductDestination {
  platform: DestinationPlatform;
  url: string;
  /** Optional override for button text. If omitted, a sensible default is used. */
  label?: string;
  /** At most one destination should be primary — it becomes the hero CTA. */
  primary?: boolean;
}

export type PricingModel =
  | "free"
  | "freemium"
  | "subscription"
  | "one-time"
  | "usage-based"
  | "license"
  | "custom";

export interface ProductPricing {
  model: PricingModel;
  /** Human-readable starting price, e.g. "$9/mo", "From $49", "Free". */
  startingPrice?: string;
  currency?: string;
  /** Link to a pricing page (product-owned, not the parent site). */
  pricingUrl?: string;
  freeTier?: boolean;
  trial?: boolean;
  trialDays?: number;
}

export interface ProductSEO {
  title?: string;
  description?: string;
  /** Path under /public or an absolute URL. */
  ogImage?: string;
}

/**
 * A product record. This is the source of truth for the directory,
 * product pages, and any future admin interface.
 */
export interface Product {
  // ---- Identity ----
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  /** Free-form category, e.g. "Healthcare", "Productivity", "AI". */
  category: string;
  type: ProductType;
  /** Path under /public or an absolute URL. */
  logo?: string;
  /** Optional per-product accent color (hex). */
  accentColor?: string;
  /** Optional image gallery — paths under /public or absolute URLs. */
  gallery?: string[];

  // ---- Destination ----
  destinations: ProductDestination[];

  // ---- Lifecycle ----
  status: ProductStatus;
/** Manual override. If true, forces public visibility regardless of status. */
  publiclyVisible?: boolean;
  // ---- Commercial (all optional) ----
  pricing?: ProductPricing;

  // ---- Discovery ----
  /** Lower number = shown earlier. Products without a value sort last. */
  displayOrder?: number;
  /** ISO date string, e.g. "2026-03-15". */
  launchDate?: string;
  tags?: string[];
  /** Bullet-style feature list for the product page. */
  features?: string[];

  // ---- SEO ----
  seo?: ProductSEO;
}