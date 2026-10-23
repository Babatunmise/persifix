"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { RiskAssessor } from "@/components/assessor/RiskAssessor";

export default function HomePage() {
  const [showAssessor, setShowAssessor] = useState(false);

  if (showAssessor) {
    return <RiskAssessor />;
  }

  return (
    <main className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col items-center justify-center py-20 text-center max-w-3xl space-y-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
          Your health doesn’t pause between appointments.
        </h1>
        
        <div className="space-y-6 text-lg text-neutral-400 leading-relaxed">
          <p>
            Healthcare often happens in isolated moments—a consultation, a test result, a follow-up. But your health is happening every single day. Between appointments, you are left to make sense of new symptoms, confusing readings, and daily habits, often wondering when something actually deserves attention.
          </p>
          <p>
            The information is there. Understanding what it means is the hard part.
          </p>
          <p className="text-white font-medium">
            Sanctos exists to bridge that gap.
          </p>
          <p>
            We are a continuous medical companion—a sanctuary for the health decisions that happen outside the clinic. We help you connect the dots between your daily habits and your long-term health, helping you understand what you are seeing and what your next step should be.
          </p>
          <p>
            With Sanctos, you build a better understanding of your baseline, recognize patterns over time, and walk into your next doctor’s visit prepared, organized, and confident.
          </p>
          <p>
            We are starting with cardiovascular health because it is where continuous context saves lives. But the vision is your complete peace of mind across every stage of your health.
          </p>
        </div>

        <div className="pt-8 pb-4">
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-snug">
            Health is a continuous project. <br />
            <span className="text-rose-500">Sanctos helps you navigate yours.</span>
          </p>
        </div>
<div className="pt-4 pb-2">
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Risk calculations are performed in your browser. Sanctos is designed to minimize the collection of health information.
          </p>
        </div>
        <button
          onClick={() => setShowAssessor(true)}
          className="mt-4 rounded-full bg-white px-10 py-4 text-base font-semibold text-black transition-transform hover:scale-105"
        >
          Begin Risk Assessment
        </button>
      </Container>
    </main>
  );
}