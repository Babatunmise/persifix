// features/bp-interpreter/domain/validate.ts
import { z } from "zod";
import type { ReadingInput } from "./types";

export const BPInputSchema = z.object({
  systolic: z
    .number()
    .min(40, "Systolic pressure cannot be lower than 40")
    .max(300, "Systolic pressure cannot be higher than 300"),
  diastolic: z
    .number()
    .min(20, "Diastolic pressure cannot be lower than 20")
    .max(200, "Diastolic pressure cannot be higher than 200"),
  pulse: z
    .number()
    .min(20, "Pulse cannot be lower than 20")
    .max(250, "Pulse cannot be higher than 250")
    .optional(),
  measuredAt: z.string().datetime(),
})
.refine((data) => data.systolic > data.diastolic, {
  message: "The top number (systolic) must be higher than the bottom number (diastolic).",
  path: ["systolic"],
});

export type ValidatedReading = z.infer<typeof BPInputSchema>;

// A helper function to use this in our tests and math engine
export function validateReading(input: ReadingInput) {
  return BPInputSchema.safeParse(input);
}