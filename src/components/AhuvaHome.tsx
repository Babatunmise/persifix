"use client";

import Link from "next/link";
import { useState } from "react";

type Destination = {
  title: string;
  description: string;
  icon: string;
  available: boolean;
};

const destinations: Destination[] = [
  { title: "Kitchen Studio", description: "Understand what goes into your meals as you prepare them.", icon: "skillet", available: true },
  { title: "Eating Out", description: "Understand the food you enjoy away from home.", icon: "restaurant", available: false },
  { title: "Snacks", description: "Make sense of the little things you eat between meals.", icon: "lunch_dining", available: false },
  { title: "Fruits", description: "Explore the goodness and nutrition in the fruits you enjoy.", icon: "nutrition", available: false },
  { title: "Alcohol", description: "Record what you drink and understand its health implications.", icon: "local_bar", available: false },
  { title: "Other Intake", description: "Keep your wider food and drink story together.", icon: "add_circle", available: false },
];

export default function AhuvaHome() {
  const [notice, setNotice] = useState<string | null>(null);

  function openFutureExperience(title: string) {
    setNotice(title);
  }

  return (
    <main className="min-h-screen bg-[#F8F7F1] pb-12 text-[#182D25]">
      <header className="sticky top-0 z-20 border-b border-[#183D30]/10 bg-[#F8F7F1]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#183D30] font-serif text-xl text-[#F8F7F1]" aria-hidden="true">a</div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#718477]">Sanctos · Heart health</p>
              <h1 className="font-serif text-2xl leading-none tracking-tight text-[#183D30]">Ahuva</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openFutureExperience("Your Intake Journal")}
            aria-label="Open Intake Journal"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DCE4DA] bg-white text-[#315B49] transition hover:border-[#789780] hover:bg-[#F3F6F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F927B]"
          >
            <span className="material-symbols-outlined text-[23px]" aria-hidden="true">menu_book</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 pb-10 pt-7 sm:px-8 sm:pt-10">
        <section aria-labelledby="ahuva-intro">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#718477]">Your nutrition & heart health companion</p>
          <h2 id="ahuva-intro" className="mt-2 max-w-3xl font-serif text-[2.35rem] leading-[1.04] tracking-tight text-[#183D30] sm:text-5xl">
            Understand what goes into your body.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68796E] sm:text-base sm:leading-7">
            See how your everyday food and drink choices relate to your health, with guidance shaped around you.
          </p>
        </section>

        <section aria-labelledby="health-picture-title" className="mt-7 rounded-[26px] border border-[#DDE5D9] bg-white p-5 shadow-[0_14px_40px_rgba(24,61,48,0.055)] sm:mt-9 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Your personal overview</p>
              <h3 id="health-picture-title" className="mt-1 font-serif text-2xl text-[#183D30] sm:text-3xl">Your heart health picture</h3>
            </div>
            <span className="rounded-full bg-[#EEF3EA] px-3 py-1.5 text-[10px] font-semibold text-[#536F5A]">Builds with you</span>
          </div>

          <div className="mt-5 rounded-2xl bg-[#F5F7F2] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined mt-0.5 text-[23px] text-[#63836A]" aria-hidden="true">favorite</span>
              <div>
                <p className="font-semibold text-[#29483B]">Your picture is taking shape</p>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#718076]">
                  As you record what you eat and drink, Ahuva will connect your nutritional patterns with your health profile and show you what is changing over time.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E8ECE5] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#849084]">Nutrition</p>
              <p className="mt-1 text-sm font-semibold text-[#365444]">Your food patterns</p>
              <p className="mt-1 text-xs leading-5 text-[#899589]">What your meals contribute.</p>
            </div>
            <div className="rounded-2xl border border-[#E8ECE5] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#849084]">Personal context</p>
              <p className="mt-1 text-sm font-semibold text-[#365444]">Your health priorities</p>
              <p className="mt-1 text-xs leading-5 text-[#899589]">Guidance shaped around your profile.</p>
            </div>
            <div className="rounded-2xl border border-[#E8ECE5] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#849084]">Over time</p>
              <p className="mt-1 text-sm font-semibold text-[#365444]">Your changing story</p>
              <p className="mt-1 text-xs leading-5 text-[#899589]">Patterns emerge as you build your history.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="hydration-title" className="mt-4 rounded-[22px] border border-[#DDE5D9] bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[21px] text-[#568A9A]" aria-hidden="true">water_drop</span>
              <h3 id="hydration-title" className="text-sm font-semibold text-[#29483B]">Your hydration rhythm</h3>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#849A9B]">Personalised plan</span>
          </div>
          <div className="mt-3 flex items-center gap-2" aria-label="Hydration recommendation will be personalised from your health profile">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} aria-hidden="true" className="h-2.5 flex-1 rounded-full bg-[#E9F0EF]" />
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-[#81908A]">
            Ahuva will set your recommended glasses or bottles around your health profile and any fluid guidance from your clinician.
          </p>
        </section>

        <section aria-labelledby="explore-ahuva-title" className="mt-8 sm:mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718477]">Your everyday choices</p>
              <h3 id="explore-ahuva-title" className="mt-1 font-serif text-2xl text-[#183D30] sm:text-3xl">Explore Ahuva</h3>
            </div>
            <p className="hidden text-xs text-[#899589] sm:block">Every part of your intake matters.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {destinations.map((destination) => {
              const cardClass = "group flex min-h-[172px] flex-col rounded-[22px] border border-[#DFE6DC] bg-white p-4 text-left shadow-[0_8px_26px_rgba(24,61,48,0.035)] transition hover:-translate-y-0.5 hover:border-[#9DB59F] hover:shadow-[0_14px_32px_rgba(24,61,48,0.075)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6F927B] sm:min-h-[205px] sm:rounded-[25px] sm:p-5";
              const cardContent = (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EDF3EA] text-[#315B49] transition group-hover:bg-[#E2EDE0]">
                    <span className="material-symbols-outlined text-[23px]" aria-hidden="true">{destination.icon}</span>
                  </span>
                  <span className="mt-4 flex items-center justify-between gap-2">
                    <span className="font-serif text-lg leading-tight text-[#183D30] sm:text-xl">{destination.title}</span>
                    <span className="text-lg text-[#789080]" aria-hidden="true">↗</span>
                  </span>
                  <span className="mt-1.5 text-xs leading-5 text-[#718477] sm:text-sm sm:leading-6">{destination.description}</span>
                </>
              );

              return destination.available ? (
                <Link key={destination.title} href="/ahuva-studio" className={cardClass}>
                  {cardContent}
                </Link>
              ) : (
                <button key={destination.title} type="button" onClick={() => openFutureExperience(destination.title)} className={cardClass}>
                  {cardContent}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {notice && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#172B22]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setNotice(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="ahuva-notice-title" className="w-full max-w-md rounded-t-[26px] border border-[#E5E8DF] bg-[#FBFCF9] p-5 shadow-2xl sm:rounded-[26px] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#849084]">Ahuva · Growing with you</p>
                <h3 id="ahuva-notice-title" className="mt-1 font-serif text-2xl text-[#183D30]">{notice}</h3>
              </div>
              <button type="button" onClick={() => setNotice(null)} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF2EC] text-xl text-[#536A59]">×</button>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#718076]">
              This part of Ahuva will be developed in stages. It will connect to your personal health picture as its experience becomes available.
            </p>
            <button type="button" onClick={() => setNotice(null)} className="mt-5 w-full rounded-2xl bg-[#183D30] px-5 py-3 text-sm font-semibold text-white">Back to Ahuva</button>
          </section>
        </div>
      )}
    </main>
  );
}
