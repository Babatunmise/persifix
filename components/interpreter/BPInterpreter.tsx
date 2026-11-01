"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step =
  | "onboarding"
  | "s1_age"
  | "s1_bp"
  | "s1_symptoms"
  | "s4_coffee"
  | "s4_meal"
  | "s4_meds"
  | "s4_stress"
  | "result"
  | "s9_timer"
  | "s9_30min_timer"
  | "emergency"
  | "urgent";

type SessionContext = {
  caffeine: string;
  meds: string;
  stress: string;
  meal: string;
};

type ContextKey = keyof SessionContext;

type SessionSnapshot = {
  sessionId: string;
  sessionContext: SessionContext;
  readingCount: number;
  step: Step;
  title: string;
  name: string;
  age: string;
  systolic: string;
  diastolic: string;
  symptoms: string[];
};

const SESSION_STORAGE_KEY = "sanctos_active_session";
const TIMER_STORAGE_KEY = "sanctos_30m_target";
const subscribeToHydration = () => () => {};
const getClientHydration = () => true;
const getServerHydration = () => false;

const steps: Step[] = [
  "onboarding",
  "s1_age",
  "s1_bp",
  "s1_symptoms",
  "s4_coffee",
  "s4_meal",
  "s4_meds",
  "s4_stress",
  "result",
  "s9_timer",
  "s9_30min_timer",
  "emergency",
  "urgent",
];

function isSessionContext(value: unknown): value is SessionContext {
  if (typeof value !== "object" || value === null) return false;
  const context = value as Record<string, unknown>;
  return ["caffeine", "meds", "stress", "meal"].every(
    (key) => typeof context[key] === "string",
  );
}

function isSessionSnapshot(value: unknown): value is SessionSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const snapshot = value as Record<string, unknown>;

  return (
    typeof snapshot.sessionId === "string" &&
    snapshot.sessionId.length > 0 &&
    isSessionContext(snapshot.sessionContext) &&
    typeof snapshot.readingCount === "number" &&
    [1, 2, 3].includes(snapshot.readingCount) &&
    typeof snapshot.step === "string" &&
    steps.includes(snapshot.step as Step) &&
    typeof snapshot.title === "string" &&
    typeof snapshot.name === "string" &&
    typeof snapshot.age === "string" &&
    typeof snapshot.systolic === "string" &&
    typeof snapshot.diastolic === "string" &&
    Array.isArray(snapshot.symptoms) &&
    snapshot.symptoms.every((symptom) => typeof symptom === "string")
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function getInitialState(): SessionSnapshot & {
  thirtyMinuteTarget: number | null;
  error: string;
} {
  const defaults: SessionSnapshot & {
    thirtyMinuteTarget: number | null;
    error: string;
  } = {
    sessionId: "",
    sessionContext: { caffeine: "", meds: "", stress: "", meal: "" },
    readingCount: 1,
    step: "onboarding",
    title: "",
    name: "",
    age: "",
    systolic: "",
    diastolic: "",
    symptoms: [],
    thirtyMinuteTarget: null,
    error: "",
  };

  if (typeof window === "undefined") return defaults;

  const savedName = localStorage.getItem("sanctos_name") || "";
  const savedTitle = localStorage.getItem("sanctos_title") || "";
  const savedAge = localStorage.getItem("sanctos_age") || "";
  const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
  const timerTarget = Number(localStorage.getItem(TIMER_STORAGE_KEY));

  let restoredSession: unknown = null;
  let error = "";
  if (storedSession) {
    try {
      restoredSession = JSON.parse(storedSession);
    } catch {
      error =
        "We couldn't restore your previous reading session. A new session has been started.";
    }
  }

  if (isSessionSnapshot(restoredSession)) {
    const timerWasLost =
      restoredSession.step === "s9_30min_timer" && timerTarget <= 0;
    return {
      ...restoredSession,
      readingCount: timerWasLost ? 3 : restoredSession.readingCount,
      step: timerWasLost ? "s1_bp" : restoredSession.step,
      thirtyMinuteTarget:
        restoredSession.step === "s9_30min_timer" && timerTarget > 0
          ? timerTarget
          : null,
      error,
    };
  }

  if (storedSession && !error) {
    error =
      "We couldn't restore your previous reading session. A new session has been started.";
  }

  return {
    ...defaults,
    name: savedName,
    title: savedTitle,
    age: savedAge,
    sessionId: savedAge ? crypto.randomUUID() : "",
    step: savedAge ? "s1_bp" : savedName ? "s1_age" : "onboarding",
    error,
  };
}

const ScreenWrapper = ({
  step,
  children,
}: {
  step: string;
  children: React.ReactNode;
}) => (
  <div
    key={step}
    className="animate-fade-in-up max-w-md mx-auto min-h-[80vh] flex flex-col justify-center px-6 py-12 text-[#F9F8F6]"
  >
    {children}
  </div>
);

function InlineError({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="mt-4 text-center text-sm text-red-500">
      {error}
    </p>
  ) : null;
}

function ContextScreen({
  step,
  question,
  field,
  error,
  isSubmitting,
  onAnswer,
}: {
  step: Step;
  question: string;
  field: ContextKey;
  error: string;
  isSubmitting: boolean;
  onAnswer: (field: ContextKey, value: string) => void;
}) {
  return (
    <ScreenWrapper step={step}>
      <h2 className="mb-12 text-4xl font-semibold">{question}</h2>
      <InlineError error={error} />
      <div className="space-y-4">
        <button
          disabled={isSubmitting}
          onClick={() => onAnswer(field, "yes")}
          className="w-full rounded-3xl bg-[#F9F8F6] py-8 text-2xl font-semibold text-black disabled:opacity-50"
        >
          Yes
        </button>
        <button
          disabled={isSubmitting}
          onClick={() => onAnswer(field, "no")}
          className="w-full rounded-3xl bg-neutral-800 py-8 text-2xl font-semibold text-[#F9F8F6] disabled:opacity-50"
        >
          No
        </button>
      </div>
    </ScreenWrapper>
  );
}

function PersistentTimer({
  targetEndTime,
  onFinish,
}: {
  targetEndTime: number;
  onFinish: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000)),
  );

  useEffect(() => {
    const updateTimeLeft = () => {
      setTimeLeft(Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000)));
    };

    updateTimeLeft();
    const timer = window.setInterval(updateTimeLeft, 1000);
    return () => window.clearInterval(timer);
  }, [targetEndTime]);

  const timeElapsed = 1800 - timeLeft;
  const cycle = Math.floor(timeElapsed / 4) % 4;
  const text =
    cycle === 0
      ? "Breathe In"
      : cycle === 1
        ? "Hold"
        : cycle === 2
          ? "Breathe Out"
          : "Hold";
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleEarlyExit = () => {
    if (
      timeLeft > 0 &&
      !window.confirm(
        `You haven't finished your breathing exercise. There are ${minutes}m ${seconds}s remaining. Check BP now?`,
      )
    ) {
      return;
    }

    onFinish();
  };

  return (
    <ScreenWrapper step="s9_30min_timer">
      <h1 className="text-center text-4xl font-semibold tracking-tight text-[#F9F8F6]">
        Let&apos;s wait a bit longer.
      </h1>
      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-left text-sm leading-relaxed text-neutral-300">
        <p className="mb-2 font-semibold text-[#F9F8F6]">
          Why are we breathing?
        </p>
        <p>
          Deep, slow breathing stimulates your vagus nerve, which acts as your
          body&apos;s natural &apos;brake&apos; system. This tells your heart
          to slow down and your blood vessels to relax.
        </p>
      </div>
      <div className="mb-6 mt-8 text-center font-mono text-7xl tracking-tighter text-[#2E5B44]">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
      <div className="relative mx-auto my-4 flex h-64 w-64 items-center justify-center">
        <div className="absolute h-32 w-32 animate-breathe-circle rounded-full bg-[#2E5B44] opacity-20" />
        <div
          className="absolute h-32 w-32 animate-breathe-circle rounded-full bg-[#2E5B44] opacity-40"
          style={{ animationDelay: "-0.2s" }}
        />
        <div className="absolute h-32 w-32 animate-breathe-circle rounded-full bg-[#2E5B44]" />
        <span className="absolute z-10 text-2xl font-semibold text-[#F9F8F6]">
          {text}
        </span>
      </div>
      <button
        onClick={handleEarlyExit}
        className="mt-8 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white"
      >
        {timeLeft === 0 ? "Done" : "Check Again Now"}
      </button>
    </ScreenWrapper>
  );
}

function BreathingTimer({ onFinish }: { onFinish: () => void }) {
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const timer = window.setInterval(
      () => setTimeLeft((previous) => Math.max(0, previous - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const timeElapsed = 600 - timeLeft;
  const cycle = Math.floor(timeElapsed / 4) % 4;
  const text =
    cycle === 0
      ? "Breathe In"
      : cycle === 1
        ? "Hold"
        : cycle === 2
          ? "Breathe Out"
          : "Hold";
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <ScreenWrapper step="s9_timer">
      <h1 className="text-center text-4xl font-semibold tracking-tight text-[#F9F8F6]">
        Let&apos;s take a break.
      </h1>
      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-left text-sm leading-relaxed text-neutral-300">
        <p className="mb-2 font-semibold text-[#F9F8F6]">
          Why are we breathing?
        </p>
        <p>
          Deep, slow breathing stimulates your vagus nerve, which acts as your
          body&apos;s natural &apos;brake&apos; system. This tells your heart
          to slow down and your blood vessels to relax.
        </p>
      </div>
      <div className="mb-6 mt-8 text-center font-mono text-7xl tracking-tighter text-[#2E5B44]">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>
      <div className="relative mx-auto my-4 flex h-64 w-64 items-center justify-center">
        <div className="absolute h-32 w-32 animate-breathe-circle rounded-full bg-[#2E5B44] opacity-20" />
        <div
          className="absolute h-32 w-32 animate-breathe-circle rounded-full bg-[#2E5B44] opacity-40"
          style={{ animationDelay: "-0.2s" }}
        />
        <div className="absolute h-32 w-32 animate-breathe-circle rounded-full bg-[#2E5B44]" />
        <span className="absolute z-10 text-2xl font-semibold text-[#F9F8F6]">
          {text}
        </span>
      </div>
      <button
        onClick={onFinish}
        className="mt-8 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white"
      >
        Done
      </button>
    </ScreenWrapper>
  );
}

export function BPInterpreter() {
  const router = useRouter();
  const [initialState] = useState(getInitialState);
  const [step, setStep] = useState<Step>(initialState.step);
  const [title, setTitle] = useState(initialState.title);
  const [name, setName] = useState(initialState.name);
  const [age, setAge] = useState(initialState.age);
  const [systolic, setSystolic] = useState(initialState.systolic);
  const [diastolic, setDiastolic] = useState(initialState.diastolic);
  const [symptoms, setSymptoms] = useState<string[]>(initialState.symptoms);
  const [error, setError] = useState(initialState.error);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readingCount, setReadingCount] = useState(initialState.readingCount);
  const [sessionId, setSessionId] = useState(initialState.sessionId);
  const [sessionContext, setSessionContext] = useState<SessionContext>(
    initialState.sessionContext,
  );
  const [thirtyMinuteTarget, setThirtyMinuteTarget] = useState<number | null>(
    initialState.thirtyMinuteTarget,
  );
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydration,
    getServerHydration,
  );

  const symptomList = [
    "Chest pain",
    "Severe headache",
    "One-sided weakness",
    "Trouble speaking",
    "Shortness of breath",
    "Confusion",
  ];

  useEffect(() => {
    if (!isHydrated || !sessionId) return;

    if (step !== "s9_30min_timer") {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }

    const snapshot: SessionSnapshot = {
      sessionId,
      sessionContext,
      readingCount,
      step,
      title,
      name,
      age,
      systolic,
      diastolic,
      symptoms,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    age,
    diastolic,
    isHydrated,
    name,
    readingCount,
    sessionContext,
    sessionId,
    step,
    symptoms,
    systolic,
    title,
  ]);

  const startNewSession = () => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setThirtyMinuteTarget(null);
    setSessionId(crypto.randomUUID());
    setSessionContext({ caffeine: "", meds: "", stress: "", meal: "" });
    setReadingCount(1);
    setSystolic("");
    setDiastolic("");
    setSymptoms([]);
    setError("");
    setStep("s1_bp");
  };

  const advanceToReading = (nextReading: 2 | 3) => {
    setReadingCount(nextReading);
    setSystolic("");
    setDiastolic("");
    setSymptoms([]);
    setError("");
    setStep("s1_bp");
  };

  const continueToNextReading = () => {
    if (readingCount === 1) {
      advanceToReading(2);
    } else if (readingCount === 2) {
      advanceToReading(3);
    } else {
      startNewSession();
    }
  };

  const finishTenMinuteBreathing = () => {
    if (readingCount === 1) {
      advanceToReading(2);
    } else if (readingCount === 2) {
      advanceToReading(3);
    } else {
      startNewSession();
    }
  };

  const finishThirtyMinuteBreathing = () => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    setThirtyMinuteTarget(null);
    advanceToReading(3);
  };

  const toggleSymptom = (symptom: string) => {
    setSymptoms((previous) =>
      previous.includes(symptom)
        ? previous.filter((item) => item !== symptom)
        : [...previous, symptom],
    );
    setError("");
  };

  const saveReadingToDB = async (contextData: SessionContext) => {
    if (!sessionId) {
      throw new Error("Your reading session could not be started. Please try again.");
    }

    const supabase = createClient();
    let deviceId = localStorage.getItem("sanctos_device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("sanctos_device_id", deviceId);
    }

    const payload = JSON.stringify({
      ...contextData,
      sessionId,
      readingNumber: readingCount,
    });

    const { data, error: dbError } = await supabase
      .from("readings")
      .insert({
        user_id: deviceId,
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        context_notes: payload,
      })
      .select();

    if (dbError) {
      throw new Error(
        "We couldn't save this reading right now. Please check your connection.",
      );
    }
    return data?.[0]?.id;
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;

    const sys = Number(systolic);
    const dia = Number(diastolic);
    if (
      !Number.isInteger(sys) ||
      !Number.isInteger(dia) ||
      sys > 260 ||
      sys < 60 ||
      dia > 160 ||
      dia < 30 ||
      dia >= sys
    ) {
      setError(
        "Please check your numbers. The bottom number cannot be higher than the top number, and the values must be realistic.",
      );
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const hasSymptoms = readingCount === 1 && symptoms.length > 0;
      if (hasSymptoms && (sys >= 140 || dia >= 90)) {
        await saveReadingToDB(sessionContext);
        setStep("emergency");
        return;
      }
      if (sys >= 180 || dia >= 120) {
        await saveReadingToDB(sessionContext);
        setStep("urgent");
        return;
      }

      localStorage.setItem("sanctos_age", age);
      if (readingCount === 1) {
        setStep("s4_coffee");
      } else {
        await saveReadingToDB(sessionContext);
        setStep("result");
      }
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContextAnswer = async (field: ContextKey, value: string) => {
    const updatedContext = { ...sessionContext, [field]: value };
    setSessionContext(updatedContext);

    const nextStep: Record<ContextKey, Step | "submit"> = {
      caffeine: "s4_meal",
      meal: "s4_meds",
      meds: "s4_stress",
      stress: "submit",
    };

    if (nextStep[field] !== "submit") {
      setError("");
      setStep(nextStep[field]);
      return;
    }

    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      await saveReadingToDB(updatedContext);
      setStep("result");
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startThirtyMinuteTimer = () => {
    const target = Date.now() + 30 * 60 * 1000;
    localStorage.setItem(TIMER_STORAGE_KEY, String(target));
    const snapshot: SessionSnapshot = {
      sessionId,
      sessionContext,
      readingCount,
      step: "s9_30min_timer",
      title,
      name,
      age,
      systolic,
      diastolic,
      symptoms,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    setThirtyMinuteTarget(target);
    setStep("s9_30min_timer");
  };

  const getCategory = (sys: number, dia: number) => {
    if (sys >= 140 || dia >= 90) return "Stage 2";
    if (sys >= 130 || dia >= 85) return "Stage 1";
    if (sys >= 125) return "Elevated";
    return "Normal";
  };

  const category = getCategory(Number(systolic), Number(diastolic));
  const isHighReading = category === "Stage 1" || category === "Stage 2";

  let meaningCopy = "";
  if (category === "Normal") {
    meaningCopy =
      "Your reading is in the optimal, healthy range. Keep up the great work.";
  } else if (category === "Elevated") {
    meaningCopy =
      "Your reading is slightly elevated. It's not a cause for alarm, but it's a good time to check in on your daily habits.";
  } else {
    meaningCopy =
      "Your reading is a bit higher than we would like to see regularly. Let's take a moment to help bring it down.";
  }

  let actionCopy = "";
  if (isHighReading && readingCount < 3) {
    actionCopy =
      "Take a moment to sit quietly, keep your feet flat, and follow the breathing timer on your screen.";
  } else if (readingCount === 3 && isHighReading) {
    actionCopy =
      "Your blood pressure remains high even after two resting periods. We strongly recommend contacting your doctor today.";
  } else {
    actionCopy =
      "Continue maintaining your healthy habits and check your blood pressure again tomorrow.";
  }

  if (!isHydrated) return null;

  if (step === "onboarding") {
    return (
      <ScreenWrapper step={step}>
        <h1 className="mb-2 text-4xl font-semibold">
          Let&apos;s decode your numbers.
        </h1>
        <p className="mb-12 text-neutral-400">What should we call you?</p>
        <div className="space-y-8">
          <select
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full border-b border-neutral-700 bg-transparent py-4 text-2xl text-[#F9F8F6] focus:border-[#2E5B44] focus:outline-none"
          >
            <option value="" className="text-black">
              Title...
            </option>
            <option value="Sir" className="text-black">
              Sir
            </option>
            <option value="Ma" className="text-black">
              Ma
            </option>
          </select>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="First Name"
            className="w-full border-b border-neutral-700 bg-transparent py-4 text-2xl text-[#F9F8F6] focus:border-[#2E5B44] focus:outline-none"
          />
          <InlineError error={error} />
          <button
            onClick={() => {
              localStorage.setItem("sanctos_name", name);
              localStorage.setItem("sanctos_title", title);
              setStep("s1_age");
            }}
            disabled={!name}
            className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === "s1_age") {
    return (
      <ScreenWrapper step={step}>
        <p className="mb-4 text-xl text-neutral-400">
          Thanks, {title} {name}.
        </p>
        <h2 className="mb-12 text-5xl font-semibold">How old are you?</h2>
        <input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          value={age}
          onChange={(event) => setAge(event.target.value)}
          autoFocus
          className="w-full border-b-2 border-neutral-700 bg-transparent pb-4 text-center text-7xl font-semibold focus:border-[#2E5B44] focus:outline-none"
        />
        <InlineError error={error} />
        <button
          onClick={() => {
            localStorage.setItem("sanctos_age", age);
            startNewSession();
          }}
          disabled={!age}
          className="mt-16 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50"
        >
          Next
        </button>
      </ScreenWrapper>
    );
  }

  if (step === "s1_bp") {
    return (
      <ScreenWrapper step={step}>
        <h2 className="mb-12 text-4xl font-semibold">
          What is your reading?
        </h2>
        <div className="flex items-center justify-center gap-4">
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={systolic}
            onChange={(event) => {
              setSystolic(event.target.value);
              setError("");
            }}
            autoFocus
            placeholder="120"
            className="w-32 border-b-2 border-neutral-700 bg-transparent pb-4 text-center text-6xl font-semibold focus:border-[#2E5B44] focus:outline-none"
          />
          <span className="text-6xl text-neutral-600">/</span>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={diastolic}
            onChange={(event) => {
              setDiastolic(event.target.value);
              setError("");
            }}
            placeholder="80"
            className="w-32 border-b-2 border-neutral-700 bg-transparent pb-4 text-center text-6xl font-semibold focus:border-[#2E5B44] focus:outline-none"
          />
        </div>
        <InlineError error={error} />
        <button
          onClick={() =>
            readingCount === 1 ? setStep("s1_symptoms") : handleFinalSubmit()
          }
          disabled={!systolic || !diastolic || isSubmitting}
          className="mt-16 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? "Checking..." : "Next"}
        </button>
      </ScreenWrapper>
    );
  }

  if (step === "s1_symptoms") {
    return (
      <ScreenWrapper step={step}>
        <h2 className="mb-8 text-3xl font-semibold">
          Any of these right now?
        </h2>
        <div className="space-y-3">
          {symptomList.map((symptom) => (
            <button
              key={symptom}
              onClick={() => toggleSymptom(symptom)}
              className={`w-full rounded-2xl border-2 p-5 text-left ${
                symptoms.includes(symptom)
                  ? "border-red-500 bg-red-900/20 text-red-400"
                  : "border-neutral-700 bg-neutral-900 text-neutral-300"
              }`}
            >
              {symptom}
            </button>
          ))}
        </div>
        <InlineError error={error} />
        <button
          onClick={handleFinalSubmit}
          disabled={isSubmitting}
          className="mt-10 w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? "Checking..." : "Check Reading"}
        </button>
      </ScreenWrapper>
    );
  }

  if (step === "s4_coffee") {
    return (
      <ContextScreen
        step={step}
        question="Did you just drink coffee, smoke, or exercise?"
        field="caffeine"
        error={error}
        isSubmitting={isSubmitting}
        onAnswer={handleContextAnswer}
      />
    );
  }
  if (step === "s4_meal") {
    return (
      <ContextScreen
        step={step}
        question="Did you eat a heavy or salty meal recently (like extra Maggi)?"
        field="meal"
        error={error}
        isSubmitting={isSubmitting}
        onAnswer={handleContextAnswer}
      />
    );
  }
  if (step === "s4_meds") {
    return (
      <ContextScreen
        step={step}
        question="Have you taken your BP medication today?"
        field="meds"
        error={error}
        isSubmitting={isSubmitting}
        onAnswer={handleContextAnswer}
      />
    );
  }
  if (step === "s4_stress") {
    return (
      <ContextScreen
        step={step}
        question="Did you sleep poorly or feel stressed today?"
        field="stress"
        error={error}
        isSubmitting={isSubmitting}
        onAnswer={handleContextAnswer}
      />
    );
  }

  if (step === "emergency") {
    return (
      <ScreenWrapper step={step}>
        <div className="rounded-3xl border border-red-900 bg-red-950 p-8">
          <h1 className="mb-4 text-3xl font-bold text-red-400">
            Seek immediate medical care.
          </h1>
          <p className="text-red-200">
            Please go to the nearest emergency room.
          </p>
        </div>
      </ScreenWrapper>
    );
  }
  if (step === "urgent") {
    return (
      <ScreenWrapper step={step}>
        <div className="rounded-3xl border border-orange-900 bg-orange-950 p-8">
          <h1 className="mb-4 text-3xl font-bold text-orange-400">
            Reading is very high.
          </h1>
          <p className="text-orange-200">
            Rest for 5 mins and test again. If it remains this high, contact
            your doctor.
          </p>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === "result") {
    return (
      <ScreenWrapper step={step}>
        <p className="mb-2 text-2xl text-neutral-400">
          Thanks for checking in today.
        </p>
        <h1 className="mb-8 text-6xl font-semibold">
          {systolic}/{diastolic}.
        </h1>
        <div className="space-y-6">
          <div>
            <span className="mb-1 block text-sm uppercase tracking-widest text-neutral-500">
              The Meaning
            </span>
            <p className="text-neutral-200">{meaningCopy}</p>
          </div>
          <div>
            <span className="mb-1 block text-sm uppercase tracking-widest text-neutral-500">
              The Action
            </span>
            <p className="text-neutral-300">{actionCopy}</p>
          </div>
        </div>

        {isHighReading && readingCount === 1 && (
          <div className="mt-10 space-y-3">
            <button
              onClick={() => setStep("s9_timer")}
              className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white"
            >
              Rest and Breathe (10 Mins)
            </button>
            <button
              onClick={continueToNextReading}
              className="w-full rounded-full bg-neutral-800 py-5 text-xl font-semibold text-white"
            >
              Skip / Log Another
            </button>
          </div>
        )}

        {isHighReading && readingCount === 2 && (
          <div className="mt-10 space-y-3">
            <button
              onClick={startThirtyMinuteTimer}
              className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white"
            >
              Wait 30 Minutes
            </button>
            <button
              onClick={continueToNextReading}
              className="w-full rounded-full bg-neutral-800 py-5 text-xl font-semibold text-white"
            >
              Skip / Log Another
            </button>
          </div>
        )}

        {isHighReading && readingCount === 3 && (
          <button
            onClick={startNewSession}
            className="mt-10 w-full rounded-full bg-neutral-800 py-5 text-xl font-semibold text-white"
          >
            Log Another Reading
          </button>
        )}

        {!isHighReading && (
          <div className="mt-10 space-y-3">
            <p className="text-center text-sm text-neutral-400">
              Deep breathing is great for maintaining a healthy baseline.
            </p>
            <button
              onClick={() => setStep("s9_timer")}
              className="w-full rounded-full bg-[#2E5B44] py-5 text-xl font-semibold text-white"
            >
              Try Breathing
            </button>
            <button
              onClick={continueToNextReading}
              className="w-full rounded-full bg-neutral-800 py-5 text-xl font-semibold text-white"
            >
              Log Another Reading
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-neutral-800 pt-6">
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-full bg-transparent py-4 text-lg font-medium text-neutral-400 transition-colors hover:text-white"
          >
            Go Home
          </button>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === "s9_timer") {
    return <BreathingTimer onFinish={finishTenMinuteBreathing} />;
  }
  if (step === "s9_30min_timer" && thirtyMinuteTarget !== null) {
    return (
      <PersistentTimer
        targetEndTime={thirtyMinuteTarget}
        onFinish={finishThirtyMinuteBreathing}
      />
    );
  }

  return null;
}
