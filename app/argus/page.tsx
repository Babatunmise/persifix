import { Container } from "@/components/ui/Container";

export default function ArgusHomePage() {
  return (
    <main>
      <Container className="py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          In development
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-neutral-900 sm:text-6xl">
          Argus.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600">
          Argus is being developed by Persifix as a cardiovascular health
          companion. Nothing here is usable yet. No specification has been
          approved, and no feature described on this page is available.
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-500">
          When Argus has something real to offer, this page will say so
          plainly.
        </p>
      </Container>
    </main>
  );
}