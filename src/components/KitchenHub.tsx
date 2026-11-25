"use client";

import Link from "next/link";

const activities = [
  {
    title: "Cooking",
    description: "Plan a meal, make better food choices and cook with Ahuva.",
    href: "/kitchen/cooking",
    status: "Available",
    symbol: "✳",
    active: true,
    tone: "bg-[#E8EFE5]",
  },
  {
    title: "Eating out",
    description: "Find satisfying options when you’re eating away from home.",
    href: "#eating-out",
    status: "Coming next",
    symbol: "↗",
    active: false,
    tone: "bg-[#F3EBDD]",
  },
  {
    title: "Snacking",
    description: "Make thoughtful snack choices for the moments between meals.",
    href: "#snacking",
    status: "Coming next",
    symbol: "◇",
    active: false,
    tone: "bg-[#E9EAF2]",
  },
];

export default function KitchenHub() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F8F7F1] pb-28 text-[#182D25]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-36 h-[26rem] w-[26rem] rounded-full bg-[#DDE9D9]/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-28 h-[28rem] w-[28rem] rounded-full bg-[#F0E5D2]/65 blur-3xl" />
      <header className="relative z-10 border-b border-[#183D30]/10 bg-[#F8F7F1]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-4 sm:px-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#183D30] font-serif text-xl text-[#F8F7F1]">K</div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#718477]">Sanctos</p>
            <h1 className="font-serif text-2xl leading-none tracking-tight">Kitchen</h1>
          </div>
        </div>
      </header>
      <div className="relative z-10 mx-auto max-w-4xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#718477]">Food, made more thoughtful</p>
          <h2 className="mt-4 font-serif text-[2.8rem] leading-[1.05] tracking-tight text-[#183D30] sm:text-6xl">What would you like to do?</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#68796E] sm:text-lg">Whether you’re cooking at home, eating out or looking for a snack, Kitchen helps you make a good food decision.</p>
        </div>
        <section aria-label="Kitchen activities" className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {activities.map((activity, index) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${activity.tone} font-serif text-2xl text-[#315B49]`}>{activity.symbol}</span>
                  <span className={activity.active ? "rounded-full bg-[#E8EFE5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#315B49]" : "rounded-full bg-[#F2F1EC] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8B918A]"}>{activity.status}</span>
                </div>
                <div className="mt-auto flex items-end justify-between gap-2 pt-5">
                  <div>
                    <h3 className="font-serif text-xl text-[#183D30] sm:text-3xl">{activity.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[#718477] sm:text-sm sm:leading-6">{activity.description}</p>
                  </div>
                  <span aria-hidden="true" className="pb-1 text-2xl text-[#789080]">{activity.active ? "→" : "·"}</span>
                </div>
              </>
            );
            return activity.active ? (
              <Link key={activity.title} href={activity.href} className="group flex min-h-52 flex-col rounded-[1.5rem] border border-[#183D30]/10 bg-white/90 p-4 shadow-[0_12px_36px_rgba(24,61,48,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-[#6F927B]/50 hover:shadow-[0_18px_42px_rgba(24,61,48,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F927B] focus-visible:ring-offset-2 sm:min-h-64 sm:rounded-[1.75rem] sm:p-6">
                {content}
              </Link>
            ) : (
              <div key={activity.title} aria-disabled="true" className="flex min-h-52 flex-col rounded-[1.5rem] border border-[#183D30]/8 bg-white/55 p-4 sm:min-h-64 sm:rounded-[1.75rem] sm:p-6">
                {content}
              </div>
            );
          })}
        </section>
        <p className="mt-10 text-xs text-[#8B9A8E]">Good food decisions, wherever you are.</p>
      </div>
    </main>
  );
}
