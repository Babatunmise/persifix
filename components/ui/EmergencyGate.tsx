"use client";

import { useState } from "react";

export function EmergencyGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCatchAll, setShowCatchAll] = useState(false);

  const handleEmergency = () => {
    // Force a hard browser reload to the emergency page.
    // This bypasses any React routing errors, ensuring the safety gate ALWAYS works.
    window.location.href = "/emergency";
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowCatchAll(false); // Reset state on close
  };

  return (
    <>
      {/* The Persistent Floating Button */}
    <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full border border-red-900/50 bg-[#1a0a0a] px-6 py-3 text-sm font-semibold text-red-400 shadow-lg backdrop-blur-md transition-transform hover:scale-105"
      >
        Feeling unwell right now?
      </button>
      {/* The Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-[#121212] p-6 text-[#F9F8F6] shadow-2xl">
            
            {!showCatchAll ? (
              // STEP 1: The Main Checklist
              <>
                <h2 className="text-2xl font-semibold mb-2">Are you experiencing any of these?</h2>
                <p className="text-sm text-neutral-400 mb-6">If you are in immediate danger, call your local emergency number now.</p>

                <div className="space-y-3">
                  <button onClick={handleEmergency} className="w-full rounded-xl bg-red-950/50 p-4 text-left font-medium text-red-200 border border-red-900/50 hover:bg-red-900/50 transition-colors">
                    Chest pain or pressure
                  </button>
                  <button onClick={handleEmergency} className="w-full rounded-xl bg-red-950/50 p-4 text-left font-medium text-red-200 border border-red-900/50 hover:bg-red-900/50 transition-colors">
                    Sudden weakness or facial drooping
                  </button>
                  <button onClick={handleEmergency} className="w-full rounded-xl bg-red-950/50 p-4 text-left font-medium text-red-200 border border-red-900/50 hover:bg-red-900/50 transition-colors">
                    Difficulty speaking or confusion
                  </button>
                  
                  {/* THE CATCH-ALL BUTTON */}
                  <button onClick={() => setShowCatchAll(true)} className="w-full rounded-xl bg-neutral-800 p-4 text-left font-medium text-neutral-300 border border-neutral-700 hover:bg-neutral-700 transition-colors">
                    Something just feels wrong...
                  </button>
                </div>
              </>
            ) : (
              // STEP 2: The Catch-All Follow-up
              <>
                <h2 className="text-2xl font-semibold mb-2">Is the feeling severe or getting worse?</h2>
                <p className="text-sm text-neutral-400 mb-6">If you feel like something is seriously wrong, trust your instincts.</p>

                <div className="space-y-3">
                  {/* THE "YES" BUTTON - MUST GO TO EMERGENCY */}
                  <button onClick={handleEmergency} className="w-full rounded-xl bg-red-950/50 p-4 text-left font-medium text-red-200 border border-red-900/50 hover:bg-red-900/50 transition-colors">
                    Yes, it is severe or getting worse
                  </button>
                  
                  {/* THE "NO" BUTTON - MUST CLOSE THE MODAL */}
                  <button onClick={handleClose} className="w-full rounded-xl bg-neutral-800 p-4 text-left font-medium text-neutral-300 border border-neutral-700 hover:bg-neutral-700 transition-colors">
                    No, it's mild and stable
                  </button>
                </div>
              </>
            )}

            <button
              onClick={handleClose}
              className="mt-6 w-full rounded-full bg-transparent py-4 font-semibold text-neutral-500 transition-colors hover:text-neutral-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}