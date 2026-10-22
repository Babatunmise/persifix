import type { Metadata } from "next";
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
  robots: { index: false, follow: false },
  icons: { 
    icon: "/sanctos-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="flex min-h-screen flex-col antialiased bg-[#121212] text-white font-sans">
        <header className="border-b border-neutral-800">
          <Container className="flex h-16 items-center justify-between">
            <img src="/sanctos-logo.png" alt="SANCTOS" className="h-6 w-auto" />
        
            <span className="text-xs uppercase tracking-wider text-neutral-400">
              In development
            </span>
          </Container>
        </header>
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="border-t border-neutral-800">
          <Container className="py-8 text-xs text-neutral-500 flex justify-between">
            <p>© {siteConfig.currentYear} {siteConfig.name}.</p>
            <p>Not a medical device. No clinical claim.</p>
          </Container>
        </footer>
      </body>
    </html>
  );
}