// lib/site-config.ts

/**
 * Central config for site-wide values.
 * Edit here, not scattered across components.
 */
export const siteConfig = {
  name: "Persifix",
  tagline: "Ideas into products.",
  description:
    "Persifix is an independent product studio building useful tools, digital experiences, and applications for people and businesses.",

  /** Placeholder — swap when you have a real address. */
  email: "hello@persifix.com",

  /** Update once a year, or when you redeploy after New Year's. */
  currentYear: 2026,
  nav: [
    { label: "Products", href: "/products" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],

  footer: {
    product: [{ label: "All Products", href: "/products" }],
    company: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    legal: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
} as const;

export type SiteConfig = typeof siteConfig;