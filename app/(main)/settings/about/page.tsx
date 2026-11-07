


import { Container } from "@/components/ui/Container";
import Link from "next/link";

export default function PlaceholderPage() {
  return (
    <Container className="py-12 min-h-screen">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-3xl font-semibold mb-4 text-[#F9F8F6]">Coming Soon</h1>
        <p className="text-neutral-400 mb-8">This specific setting is being built.</p>
        <Link href="/settings" className="rounded-full bg-[#2E5B44] px-6 py-3 text-sm font-semibold text-white">
          Back to Settings
        </Link>
      </div>
    </Container>
  );
}



