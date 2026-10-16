# Persifix

The parent website and product directory for **Persifix**, an independent product studio.

Persifix turns ideas into products. This repository is the studio's central digital home — it represents the company, showcases its product portfolio, and routes visitors to individual product applications.

## Stack

- [Next.js](https://nextjs.org) (App Router, v16+)
- TypeScript
- Tailwind CSS
- Deployed on Vercel

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build (validates everything) |
| `npm run start` | Run the production build locally |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type-check without emitting files |

## Project structure

```
app/                  # Routes (App Router)
  page.tsx            # Homepage
  products/
    page.tsx          # Product directory
    [slug]/page.tsx   # Dynamic product page
  about, contact, privacy, terms
  not-found.tsx       # Custom 404
components/
  layout/             # Nav, Footer
  products/           # ProductCard and future product components
  ui/                 # Container and other primitives
data/
  products.ts         # The product registry — edit this to add products
lib/
  products.ts         # Query layer (visibility, sorting, lookup)
  site-config.ts      # Site-wide values (name, email, nav, footer)
types/
  product.ts          # Product schema
public/               # Static assets (logos, screenshots)
```

## Adding a product

1. Open `data/products.ts`.
2. Add a new object to the `products` array. Required fields: `id`, `name`, `slug`, `shortDescription`, `fullDescription`, `category`, `type`, `destinations`, `status`.
3. Set `status` to control visibility:
   - `idea`, `in-development` — never public
   - `coming-soon` — public only if `publiclyVisible: true`
   - `live` — always public
   - `paused`, `discontinued` — hidden from directory, but page still loads
4. Set `destinations` as an array. A web-only product needs one entry. A mobile product adds `ios` / `android` entries.
5. Commit and push. Vercel rebuilds automatically.

Nothing else in the codebase needs to change.

## Product assets

Place logos in `public/products/<slug>/logo.png` and reference them as `/products/<slug>/logo.png` in the product record. Same for screenshots in the `gallery` field.

## Deployment

Deployed on Vercel. Every push to `main` triggers a production deploy. Pull requests get preview deploys.

Environment variables (if ever needed) belong in Vercel's dashboard, not in the repo.

## Roadmap

- Phase 2: Design polish, animations, real brand mark
- Phase 3: Optional admin dashboard backed by a database
- Phase 4: Shared infrastructure for product apps (auth, billing) if a product needs it

## License

Private. © Persifix.