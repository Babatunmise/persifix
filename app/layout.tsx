import type { Metadata } from "next";
import Image from "next/image";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site-config";

const outfit = Outfit({ 
  subsets: ["latin"], 
  variable: "--font-sanctos" 
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="flex min-h-screen flex-col antialiased bg-[#121212] text-[#F9F8F6]">
        <header className="border-b border-neutral-800 bg-[#121212]">
          <Container className="flex h-16 items-center justify-between">
            <Image src="/sanctos-logo.png" alt="getsanctos" width={32} height={32} className="h-6 w-auto object-contain" />
            {/* The "In Development" badge has been removed */}
          </Container>
        </header>
        
        <div className="flex-1 flex flex-col">{children}</div>
        
        <footer className="border-t border-neutral-800 bg-[#121212]">
          <Container className="py-8 text-xs text-neutral-500 flex justify-center text-center">
            <p>© {siteConfig.currentYear} {siteConfig.name}. A companion for your care, not a replacement for your doctor.</p>
          </Container>
        </footer>
      </body>
    </html>
  );
}