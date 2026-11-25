import { NextRequest } from "next/server";
import { authenticateRequest, enforceRateLimit, jsonError } from "@/lib/api-security";

// Ahuva's external conversational processor is intentionally unavailable.
// Keep authenticated request verification and the shared HEP-002 rate limit
// in place, but fail closed regardless of environment-variable state until
// Argus approves the provider, data processing, consent and validation design.
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  const limited = await enforceRateLimit(auth.supabase, "kitchen");
  if (limited) return limited;

  return jsonError(
    "Ahuva's conversational service is not enabled yet. Your request was not sent to an external AI provider.",
    503,
  );
}
