// features/bp-interpreter/domain/copy.ts
import type { UiState } from "./types";

export const COPY: Record<UiState, { headline: string; subtext: string }> = {
  HEALTHY_FIRST: {
    headline: "This is a great, healthy starting point.",
    subtext: "We've saved this reading. As you log more over the next few days, we'll start to understand your usual range.",
  },
 BORDERLINE_FIRST: {
    headline: "Slightly above the healthy range.",
    subtext: "One reading isn't a verdict. Let's rest for 5 minutes and check again. Your 7-day average will give us a clearer picture.",
  },
  BORDERLINE_FIRST_EDGE: {
    headline: "Right on the line between healthy and worth watching.",
    subtext: "One reading can't settle it. Let's rest for 5 minutes and check again. Your 7-day average will give us a clearer picture.",
  },
  HIGH_FIRST: {
    headline: "This is in the higher range.",
    subtext: "One reading isn't a verdict. Rest for 5 minutes and take another. Over the next 3 days, let's check your BP in the mornings and evenings.",
  },
  STEADY: {
    headline: "Right in your usual range.",
    subtext: "Keep doing what you're doing. Your habits are working.",
  },
  SLIGHTLY_HIGHER: {
    headline: "A tiny bit higher than your usual.",
    subtext: "Nothing to worry about. Let's take a moment to settle, then check again later.",
  },
  SIGNIFICANTLY_HIGHER: {
    headline: "Well above your usual range.",
    subtext: "Let's take a moment to breathe and bring things back down. If it stays high, please contact your clinician.",
  },
  BETTER_THAN_USUAL: {
    headline: "Lower than your usual readings.",
    subtext: "Whatever you did today is working. Keep it up.",
  },
  LOW_CHECK: {
    headline: "This reading is quite low.",
    subtext: "If you are feeling dizzy or faint, please sit down and hydrate. If you feel unwell, contact your clinician.",
  },
};