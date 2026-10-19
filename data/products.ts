// data/products.ts

import type { Product } from "@/types/product";

/**
 * The Persifix product registry.
 *
 * Add a product by adding an object to this array.
 * Nothing else in the codebase needs to change — the directory,
 * product pages, and homepage featured section all read from here.
 *
 * Visibility rules live in lib/products.ts, not here.
 */
export const products: Product[] = [
  {
    id: "example-product",
    name: "Example Product",
    slug: "example-product",
    status: "coming-soon",
    category: "Productivity",
    type: "web-app",
    shortDescription:
      "A placeholder product so the site has something to render while we build.",
    fullDescription:
      "This is a placeholder record. Replace it with a real product when you're ready. It exists so the directory, product page template, and homepage featured section have real data to work with during development.",
    destinations: [
      {
        platform: "web",
        url: "https://example.persifix.com",
        primary: true,
      },
    ],
    features: [
      "First feature goes here",
      "Second feature goes here",
      "Third feature goes here",
    ],
    displayOrder: 1,
    tags: ["placeholder", "example"],
  },
  {
    id: "argus",
    name: "Argus",
    slug: "argus",
    status: "in-development",
    category: "Healthcare",
    type: "web-app",
    shortDescription:
      "A cardiovascular health companion, in development.",
    fullDescription:
      "Argus is a product by Persifix, in development. It aims to become a persistent cardiovascular health companion that helps people understand their cardiovascular health and act appropriately between clinical encounters. It is not a doctor, not diagnostic, and not an emergency service. No specification has been approved and no feature is available.",
    destinations: [
      {
        platform: "web",
        url: "/argus",
        primary: true,
      },
    ],
    displayOrder: 2,
    tags: ["cardiology", "health", "in-development"],
  },
];