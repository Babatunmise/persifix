"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/auth";

type Reading = {
  systolic: number;
  diastolic: number;
  taken_at: string;
  context: any;
};

export default function ReportPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [userName, setUserName] = useState("");
  const [avgSys, setAvgSys] = useState(0);
  const [avgDia, setAvgDia] = useState(0);
  const [missedMedsCount, setMissedMedsCount] = useState(0);
  const [stressCount, setStressCount] = useState(0);
  const [poorSleepCount, setPoorSleepCount] = useState(0);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setUserName(localStorage.getItem("sanctos_name") || "Patient");
        
        const session = await ensureAnonymousSession();
        if (!session) return;

        const supabase = createClient();
        const { data } = await supabase
          .from("readings")
          .select("systolic, diastolic, taken_at, context")
          .eq("user_id", session.user.id)
          .order("taken_at", { ascending: false })
          .limit(30);

        if (data && data.length > 0) {
          setReadings(data);
          
          // Calculate Averages
          const sysTotal = data.reduce((acc, r) => acc + r.systolic, 0);
          const diaTotal = data.reduce((acc, r) => acc + r.diastolic, 0);
          setAvgSys(Math.round(sysTotal / data.length));
          setAvgDia(Math.round(diaTotal / data.length));

          // Calculate Context Correlations
          let missed = 0;
          let stressed = 0;
          let sleep = 0;
          
          data.forEach(r => {
            if (r.context?.medication === "No" || r.context?.medication === "missed") missed++;
            if (r.context?.stress && r.context?.stress !== "None") stressed++;
            if (r.context?.sleep === "Less than 5 hrs") sleep++;
          });

          setMissedMedsCount(missed);
          setStressCount(stressed);
          setPoorSleepCount(sleep);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-white text-black p-12">Generating Report...</div>;
  }

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      {/* Screen-only controls */}
      <div className="bg-[#121212] p-6 flex justify-between items-center print:hidden">
        <Link href="/settings" className="text-[#F9F8F6] underline text-sm">
          ← Back to Settings
        </Link>
        <button 
          onClick={() => window.print()}
          className="rounded-full bg-[#2E5B44] px-6 py-3 text-sm font-semibold text-white"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* The Document */}
      <div className="bg-white text-black max-w-4xl mx-auto p-12 print:p-0 print:max-w-none">
        
        {/* Header */}
        <div className="border-b-2 border-black pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">SANCTOS.</h1>
            <p className="text-sm mt-1">Clinical Handoff Summary</p>
          </div>
          <div className="text-right text-sm">
            <p><strong>Patient:</strong> {userName}</p>
            <p><strong>Date:</strong> {today}</p>
            <p><strong>Readings Logged:</strong> {readings.length} (Last 30)</p>
          </div>
        </div>

        {/* PAGE 1: Executive Summary */}
        <div className="space-y-6 mb-16 break-after-page">
          <h2 className="text-2xl font-bold bg-gray-200 p-2">1. Executive Summary</h2>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="border border-gray-300 p-6 text-center">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Average BP</p>
              <p className="text-5xl font-bold">{avgSys}/{avgDia}</p>
            </div>
            <div className="border border-gray-300 p-6 text-center">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Medication Adherence</p>
              <p className="text-5xl font-bold">{readings.length - missedMedsCount}/{readings.length}</p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-bold text-lg mb-2">Patient Context (Self-Reported)</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Reported missing medication on <strong>{missedMedsCount}</strong> days.</li>
              <li>Reported significant stress on <strong>{stressCount}</strong> days.</li>
              <li>Reported poor sleep (&lt; 5 hours) on <strong>{poorSleepCount}</strong> days.</li>
            </ul>
          </div>
        </div>

        {/* PAGE 2: Patterns in Logs */}
        <div className="space-y-6 mb-16 break-after-page">
          <h2 className="text-2xl font-bold bg-gray-200 p-2">2. Patterns in Logs</h2>
          
          <p className="text-sm text-gray-600">
            The following table represents the most recent 10 readings logged by the patient. 
          </p>

          <table className="w-full border-collapse border border-gray-300 text-sm mt-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Date</th>
                <th className="border border-gray-300 p-2 text-left">Reading</th>
                <th className="border border-gray-300 p-2 text-left">Context Logged</th>
              </tr>
            </thead>
            <tbody>
              {readings.slice(0, 10).map((r, i) => {
                const dateStr = new Date(r.taken_at).toLocaleDateString();
                const timeStr = new Date(r.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                let contextStr = [];
                if (r.context?.medication === "No" || r.context?.medication === "missed") contextStr.push("Missed Meds");
                if (r.context?.stress && r.context?.stress !== "None") contextStr.push("Stressed");
                if (r.context?.sleep === "Less than 5 hrs") contextStr.push("Poor Sleep");
                if (r.context?.diet === "Heavy on Maggi") contextStr.push("Salty Meal");
                if (contextStr.length === 0) contextStr.push("None");

                return (
                  <tr key={i}>
                    <td className="border border-gray-300 p-2">{dateStr} <span className="text-gray-500 text-xs">{timeStr}</span></td>
                    <td className="border border-gray-300 p-2 font-bold">{r.systolic}/{r.diastolic}</td>
                    <td className="border border-gray-300 p-2">{contextStr.join(", ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGE 3: Ask Your Doctor */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold bg-gray-200 p-2">3. Ask Your Doctor</h2>
          
          <p className="text-sm text-gray-600">
            Based on the patient's logged data, here are some recommended questions to ask during the consultation.
          </p>

          <div className="border-2 border-gray-400 p-6 rounded-lg bg-gray-50 mt-4 space-y-4">
            <div className="flex gap-4">
              <div className="w-6 h-6 border-2 border-black rounded mt-1 shrink-0"></div>
              <p className="text-lg">My blood pressure average is <strong>{avgSys}/{avgDia}</strong>. Is this at my goal, or should we adjust my current treatment plan?</p>
            </div>
            
            {missedMedsCount > 0 && (
              <div className="flex gap-4">
                <div className="w-6 h-6 border-2 border-black rounded mt-1 shrink-0"></div>
                <p className="text-lg">I reported missing my medication on <strong>{missedMedsCount}</strong> days. Is my current prescription schedule realistic for my lifestyle, or should we simplify it?</p>
              </div>
            )}

            {stressCount > 0 && (
              <div className="flex gap-4">
                <div className="w-6 h-6 border-2 border-black rounded mt-1 shrink-0"></div>
                <p className="text-lg">I noticed my numbers tend to run higher on days I log stress. What are some ways we can manage this beyond just medication?</p>
              </div>
            )}

            <div className="flex gap-4">
              <div className="w-6 h-6 border-2 border-black rounded mt-1 shrink-0"></div>
              <p className="text-lg">Are there any lifestyle changes or dietary shifts (like reducing sodium) that you recommend specifically for my profile?</p>
            </div>
          </div>

          <div className="mt-16 pt-6 border-t border-gray-300 text-xs text-gray-500 text-center">
            <p>Generated by SANCTOS (sanctos.health)</p>
            <p>This report is a patient-generated summary and is not a substitute for professional medical advice.</p>
          </div>
        </div>

      </div>
    </>
  );
}