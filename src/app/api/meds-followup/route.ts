import { NextRequest } from "next/server";
import { authenticateRequest, enforceRateLimit, isRecord, jsonError, readJsonBody } from "@/lib/api-security";

const ALLOWED_REASONS = new Set(["Forgot", "Ran out", "Felt dizzy"]);

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const limited = enforceRateLimit(`meds-followup:${auth.user.id}`, 6);
  if (limited) return limited;
  const body = await readJsonBody(req, 1_024);
  if (body instanceof Response) return body;
  if (!isRecord(body) || typeof body.reason !== "string" || !ALLOWED_REASONS.has(body.reason)) {
    return jsonError("Select a valid missed-dose reason", 400);
  }

  // The previous AI prompt gave dose-specific directions without knowing the
  // medication, formulation, or prescribing instructions. Isolated pending
  // clinical review; no medication or health information is sent to DeepSeek.
  return Response.json({
    narrative: "For medicine-specific missed-dose instructions, check the patient leaflet or contact your pharmacist or prescriber. Do not double a dose unless your medicine's instructions or clinician specifically tell you to.",
    clinical_review_required: true,
  });
}