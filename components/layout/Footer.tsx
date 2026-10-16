// components/layout/Footer.tsx

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  const year = siteConfig.currentYear;

  return (
    <footer className="mt-24 border-t border-neutral-200">
      <Container className="py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="text-sm font-semibold text-neutral-900">
              {siteConfig.name}
            </div>
            <p className="mt-2 text-sm text-neutral-500">
              {siteConfig.tagline}
            </p>
          </div>

          <FooterColumn
            title="Products"
            links={siteConfig.footer.product}
          />
          <FooterColumn
            title="Company"
            links={siteConfig.footer.company}
          />
          <FooterColumn
            title="Legal"
            links={siteConfig.footer.legal}
          />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-neutral-200 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center">
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <a
            href={`mailto:${siteConfig.email}`}
            className="transition-colors hover:text-neutral-900"
          >
            {siteConfig.email}
          </a>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {title}
      </div>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-neutral-700 transition-colors hover:text-neutral-900"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}