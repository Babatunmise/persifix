"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";

export function RiskAssessor() {
  const [hasStarted, setHasStarted] = useState(false);

  if (!hasStarted) {
    return (
      <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Understand your heart.
        </h1>
        <p className="mt-6 max-w-md text-lg text-neutral-400 leading-relaxed">
          A 2-minute assessment to estimate your 10-year risk of a heart attack or stroke. 
          No data is stored or sent to a server.
        </p>
        <button
          onClick={() => setHasStarted(true)}
          className="mt-10 rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition-transform hover:scale-105"
        >
          Begin Assessment
        </button>
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <p className="text-neutral-400">Location Gate (Coming next)</p>
    </Container>
  );
}