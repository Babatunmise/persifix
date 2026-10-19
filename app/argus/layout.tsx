import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: { absolute: "Argus — in development" },
  description:
    "Argus is being developed by Persifix. No specification has been approved. No feature is available.",
  robots: { index: false, follow: false },
};

export default function ArgusLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b border-amber-200 bg-amber-50">
        <Container className="py-2.5">
          <p className="text-xs text-amber-900">
            In development. Nothing on this page is usable yet. No clinical
            claim is made.
          </p>
        </Container>
      </div>
      {children}
    </>
  );
}