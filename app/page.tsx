import { Container } from "@/components/ui/Container";

export default function HomePage() {
  return (
    <main>
      <Container className="py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-400">
          In development
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
          SANCTOS<span className="text-rose-500">.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-400">
          Your medical sanctuary. We are building a cardiovascular health companion 
          to help you understand your health and act appropriately between clinical encounters.
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-500">
          Nothing here is usable yet. No specification has been approved, and no feature described on this page is available.
        </p>
      </Container>
    </main>
  );
}