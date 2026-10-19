# ADR-0003: Argus lives inside the Persifix repository

- Status: Accepted
- Date: 2026-10-19
- Deciders: Persifix Executive Office, Tunmise

## Context
Argus is Persifix's first real product. The default recommendation was a separate repository and separate deployment. Tunmise preferred centralization: all Persifix products under one roof, one repository, one deployment. 

## Decision
Argus is a route inside the existing Persifix Next.js application:
- Route tree: `app/argus/`
- Public URL today: `https://persifix.vercel.app/argus`
- The Argus product record exists in `data/products.ts` with `status: "in-development"`. It does not appear in the public directory.
- Until launch, `/argus` sets `robots: { index: false, follow: false }`.

## Consequences
Easier now: No new repository, shared UI, one deploy pipeline.
Harder later: Deployment coupling (a bad Argus commit can affect the parent site). Subdomain migration requires Next.js middleware or extraction. 

## Review triggers
Revisit this ADR if Argus handles user data, begins clinical logic, or a second product begins development.