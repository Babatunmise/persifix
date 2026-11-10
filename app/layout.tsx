
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/site-config";
import { AppConfigProvider } from "@/components/providers/AppConfigProvider";

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
    <html lang="en" className={outfit.variable} data-scroll-behavior="smooth">
     <body className="antialiased bg-[#121212] text-[#F9F8F6]">
        <AppConfigProvider>
          {children}
        </AppConfigProvider>
      </body>
    </html>
  );
}