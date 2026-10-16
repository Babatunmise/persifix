// app/products/[slug]/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import {
  getProductBySlug,
  getPublishedProducts,
} from "@/lib/products";
import { siteConfig } from "@/lib/site-config";
import type { Product, ProductDestination } from "@/types/product";

/**
 * Pre-render every published product page at build time.
 */
export function generateStaticParams() {
  return getPublishedProducts().map((p) => ({ slug: p.slug }));
}

/**
 * Per-product SEO metadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};

  const title = product.seo?.title ?? product.name;
  const description =
    product.seo?.description ?? product.shortDescription;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.seo?.ogImage ? [product.seo.ogImage] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const primary =
    product.destinations.find((d) => d.primary) ??
    product.destinations[0] ??
    null;
  const secondary = product.destinations.filter((d) => d !== primary);

  const isArchived =
    product.status === "paused" || product.status === "discontinued";

  return (
    <main>
      {isArchived && (
        <div className="border-b border-amber-200 bg-amber-50">
          <Container className="py-3">
            <p className="text-sm text-amber-900">
              This product is no longer actively maintained. The information
              below is preserved for reference.
            </p>
          </Container>
        </div>
      )}

      {/* Header */}
      <section className="border-b border-neutral-200">
        <Container className="py-16 sm:py-24">
          <Link
            href="/products"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            ← All products
          </Link>

          <div className="mt-8 flex items-start gap-5">
            <ProductLogo product={product} size="lg" />
            <div className="min-w-0">
              <p className="text-sm text-neutral-500">{product.category}</p>
              <h1 className="mt-1 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
                {product.name}
              </h1>
              {product.status === "coming-soon" && (
                <span className="mt-3 inline-block rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Coming soon
                </span>
              )}
            </div>
          </div>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600">
            {product.shortDescription}
          </p>

          {(primary || secondary.length > 0) && (
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {primary && <DestinationButton destination={primary} primary />}
              {secondary.map((dest) => (
                <DestinationButton
                  key={`${dest.platform}-${dest.url}`}
                  destination={dest}
                />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* Gallery */}
      {product.gallery && product.gallery.length > 0 && (
        <section className="border-b border-neutral-200">
          <Container className="py-16">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {product.gallery.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`${product.name} screenshot ${i + 1}`}
                  className="w-full rounded-lg border border-neutral-200 object-cover"
                />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Description */}
      <section className="border-b border-neutral-200">
        <Container className="py-16">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              About {product.name}
            </h2>
            <div className="mt-4 whitespace-pre-line text-base leading-relaxed text-neutral-600">
              {product.fullDescription}
            </div>
          </div>
        </Container>
      </section>

      {/* Features */}
      {product.features && product.features.length > 0 && (
        <section className="border-b border-neutral-200">
          <Container className="py-16">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Key features
            </h2>
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {product.features.map((feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-base text-neutral-700"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* Pricing */}
      {product.pricing && (
        <section className="border-b border-neutral-200">
          <Container className="py-16">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              Pricing
            </h2>
            <div className="mt-6 max-w-xl">
              <div className="rounded-xl border border-neutral-200 p-6">
                <p className="text-sm uppercase tracking-widest text-neutral-500">
                  {pricingLabel(product.pricing.model)}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
                  {product.pricing.startingPrice ?? "—"}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm text-neutral-600">
                  {product.pricing.freeTier && <li>Free tier available</li>}
                  {product.pricing.trial && (
                    <li>
                      {product.pricing.trialDays
                        ? `${product.pricing.trialDays}-day free trial`
                        : "Free trial available"}
                    </li>
                  )}
                </ul>
                {product.pricing.pricingUrl && (
                  <Link
                    href={product.pricing.pricingUrl}
                    className="mt-6 inline-block rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400"
                  >
                    See full pricing
                  </Link>
                )}
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Footer note */}
      <section>
        <Container className="py-12">
          <p className="text-sm text-neutral-500">
            {product.name} is a product by{" "}
            <Link
              href="/"
              className="text-neutral-900 underline-offset-4 hover:underline"
            >
              {siteConfig.name}
            </Link>
            .
          </p>
        </Container>
      </section>
    </main>
  );
}

// ---- helpers ----

function ProductLogo({
  product,
  size = "sm",
}: {
  product: Product;
  size?: "sm" | "lg";
}) {
  const dims = size === "lg" ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm";

  if (product.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.logo}
        alt=""
        className={`${dims} shrink-0 rounded-lg object-cover`}
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
      className={`${dims} flex shrink-0 items-center justify-center rounded-lg font-semibold text-white`}
      style={{ backgroundColor: product.accentColor ?? "#171717" }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function DestinationButton({
  destination,
  primary = false,
}: {
  destination: ProductDestination;
  primary?: boolean;
}) {
  const label = destination.label ?? defaultLabel(destination.platform);
  const isExternal = /^https?:\/\//i.test(destination.url);

  const className = primary
    ? "rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
    : "rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400";

  if (isExternal) {
    return (
      <a
        href={destination.url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={destination.url} className={className}>
      {label}
    </Link>
  );
}

function defaultLabel(platform: ProductDestination["platform"]): string {
  switch (platform) {
    case "ios":
      return "Download on the App Store";
    case "android":
      return "Get it on Google Play";
    case "web":
      return "Open Application";
    case "macos":
      return "Download for macOS";
    case "windows":
      return "Download for Windows";
    case "chrome-extension":
      return "Add to Chrome";
    case "marketplace":
      return "View listing";
    default:
      return "Open";
  }
}

function pricingLabel(model: NonNullable<Product["pricing"]>["model"]): string {
  switch (model) {
    case "free":
      return "Free";
    case "freemium":
      return "Freemium";
    case "subscription":
      return "Subscription";
    case "one-time":
      return "One-time purchase";
    case "usage-based":
      return "Usage-based";
    case "license":
      return "License";
    case "custom":
      return "Custom pricing";
  }
}