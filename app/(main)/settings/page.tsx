"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function SettingsPage() {
  const rows = [
    { title: "Edit Profile", desc: "Name, Age, and baseline setup", href: "/settings/profile" },
    { title: "Medications", desc: "Track your prescription schedule", href: "/settings/medications" },
       { title: "Caregiver Circle", desc: "Invite family and friends to support you", href: "/settings/caregiver" },
    { title: "Reminders", desc: "Set daily check-in notifications", href: "/settings/reminders" },
    { title: "About Sanctos", desc: "Version 1.0.0 and medical disclaimers", href: "/settings/about" },
  ];

  return (
    <Container className="py-12 min-h-screen">
      <div className="max-w-md mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#F9F8F6]">Settings</h1>
          <Link href="/" className="text-sm font-medium text-[#2E5B44] hover:text-white underline">
            Back to Home
          </Link>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <Link
              key={row.title}
              href={row.href}
              className="flex items-center justify-between p-5 rounded-2xl bg-neutral-900 border border-neutral-800 transition-colors hover:bg-neutral-800"
            >
              <div>
                <h2 className="text-base font-semibold text-[#F9F8F6]">{row.title}</h2>
                <p className="text-sm text-neutral-500 mt-0.5">{row.desc}</p>
              </div>
              <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Destructive Action */}
        <div className="mt-12">
          <button 
            onClick={() => alert("Clear Data functionality coming soon.")}
            className="w-full p-5 rounded-2xl border border-red-900/30 bg-red-950/10 text-left transition-colors hover:bg-red-950/30"
          >
            <h2 className="text-base font-semibold text-red-400">Clear All Data</h2>
            <p className="text-sm text-red-900/80 mt-0.5">Permanently delete your local profile and health records.</p>
          </button>
        </div>

      </div>
    </Container>
  );
}