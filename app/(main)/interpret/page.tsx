import { Container } from "@/components/ui/Container";
import Link from "next/link";
import { BPInputForm } from "@/components/ui/BPInputForm";

export default function InterpretPage() {
  return (
    <Container className="py-12">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-sm text-neutral-400 hover:text-white mb-6 inline-block">
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-semibold mb-8 text-[#F9F8F6]">What is your reading?</h1>
        
        <BPInputForm />
      </div>
    </Container>
  );
}