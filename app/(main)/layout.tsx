import { Container } from "@/components/ui/Container";
import { EmergencyGate } from "@/components/ui/EmergencyGate";
import { siteConfig } from "@/lib/site-config";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-800 bg-[#121212]">
        <Container className="flex h-18 items-center justify-between">
          <img 
            src="/sanctos-logo.png" 
            alt="SANCTOS" 
            className="h-18 w-auto object-contain" 
          />
        </Container>
      </header>
      
      <main className="flex-1 flex flex-col">{children}</main>
      
      <footer className="border-t border-neutral-800 bg-[#121212]">
        <Container className="py-8 text-xs text-neutral-500 flex justify-center text-center">
          <p>© {siteConfig.currentYear} {siteConfig.name}. A companion for your care, not a replacement for your doctor.</p>
        </Container>
      </footer>

      {/* The Persistent Emergency Gate */}
      <EmergencyGate />
    </div>
  );
}