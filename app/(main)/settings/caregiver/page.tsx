
"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function CaregiverPage() {
  const [inviteInput, setInviteInput] = useState("");
  const [inviteSent, setInviteSent] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput) return;
    
    // Simulate sending the invite
    setInviteSent(true);
    setInviteInput("");
    
    // Reset success message after 3 seconds
    setTimeout(() => setInviteSent(false), 3000);
  };

  const tiers = [
    { name: "Viewer", desc: "Can see your shared readings and trend summary." },
    { name: "Supporter", desc: "Receives a weekly summary of your averages." },
    { name: "Care Partner", desc: "Receives alerts if you log a high reading or miss meds." },
    { name: "Primary", desc: "Full access to your dashboard and medication schedule." },
  ];

  return (
    <Container className="py-12 min-h-screen pb-24">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#F9F8F6]">Caregiver Circle</h1>
          <Link href="/settings" className="text-sm font-medium text-[#2E5B44] hover:text-white underline">
            Back
          </Link>
        </div>

        <p className="text-sm text-neutral-400 mb-8 leading-relaxed">
          Health doesn't happen in isolation. Invite a family member or trusted friend to support your journey.
        </p>

        {/* Invite Form */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#F9F8F6] mb-4">Invite Someone</h2>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input 
              type="text" 
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="Email or phone number" 
              className="flex-1 rounded-xl bg-neutral-800 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#2E5B44]"
            />
            <button 
              type="submit"
              className="rounded-xl bg-[#2E5B44] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Send
            </button>
          </form>
          {inviteSent && (
            <p className="text-[#2E5B44] text-xs mt-3 font-medium">Invite sent successfully!</p>
          )}
        </div>

        {/* Tiers Definition */}
        <div>
          <h2 className="text-lg font-semibold text-[#F9F8F6] mb-4">Access Tiers</h2>
          <div className="space-y-3">
            {tiers.map((tier, index) => (
              <div key={tier.name} className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#2E5B44] bg-[#2E5B44]/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    Tier {index + 1}
                  </span>
                  <h3 className="font-semibold text-[#F9F8F6]">{tier.name}</h3>
                </div>
                <p className="text-sm text-neutral-400">{tier.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Current Members (Mock) */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-[#F9F8F6] mb-4">Your Circle</h2>
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex justify-between items-center">
            <div>
              <p className="font-semibold text-[#F9F8F6]">Sarah (Daughter)</p>
              <p className="text-xs text-neutral-500">Invited 2 days ago</p>
            </div>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Supporter</span>
          </div>
        </div>

      </div>
    </Container>
  );
}