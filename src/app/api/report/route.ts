import { NextRequest } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import ReportDocument from "@/components/ReportDocument";
import { authenticateRequest, enforceRateLimit, jsonError } from "@/lib/api-security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const limited = enforceRateLimit(`report:${auth.user.id}`, 3);
  if (limited) return limited;
  if (req.body) return jsonError("This endpoint does not accept a request body", 400);

  try {
    // All report data is fetched server-side under the verified user's JWT.
    // Never accept patient identity or report contents from the browser.
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString();
    const userId = auth.user.id;

    const [profileRes, bpRes, weightRes, medsRes, medLogsRes, workoutsRes, sanctuaryRes] = await Promise.all([
      auth.supabase.from("profiles").select("id, name").eq("id", userId).maybeSingle(),
      auth.supabase.from("bp_readings").select("systolic, diastolic").eq("user_id", userId).gte("measured_at", sinceIso),
      auth.supabase.from("weight_logs").select("weight, weight_unit").eq("user_id", userId).order("logged_at", { ascending: false }).limit(1),
      auth.supabase.from("medications").select("name, dosage").eq("user_id", userId),
      auth.supabase.from("medication_logs").select("id").eq("user_id", userId).eq("status", "taken").gte("taken_at", sinceIso),
      auth.supabase.from("workout_logs").select("duration_mins").eq("user_id", userId).gte("created_at", sinceIso),
      auth.supabase.from("sanctuary_logs").select("activity_type, duration_mins").eq("user_id", userId).gte("created_at", sinceIso),
    ]);

    const results = [profileRes, bpRes, weightRes, medsRes, medLogsRes, workoutsRes, sanctuaryRes];
    if (results.some(result => result.error)) return jsonError("Unable to generate the report", 500);
    if (!profileRes.data) return jsonError("Patient profile not found", 404);

    const bpRows = (bpRes.data ?? []) as Array<{ systolic: number; diastolic: number }>;
    const avgSys = bpRows.length ? Math.round(bpRows.reduce((sum, row) => sum + row.systolic, 0) / bpRows.length) : "N/A";
    const avgDia = bpRows.length ? Math.round(bpRows.reduce((sum, row) => sum + row.diastolic, 0) / bpRows.length) : "N/A";
    const latestWeight = (weightRes.data?.[0] ?? { weight: "N/A", weight_unit: "" }) as { weight: number | string; weight_unit: string };
    const reportData = {
      name: profileRes.data.name ?? "Patient",
      avgSys,
      avgDia,
      totalReadings: bpRows.length,
      latestWeight: latestWeight.weight,
      weightUnit: latestWeight.weight_unit,
      meds: ((medsRes.data ?? []) as Array<{ name: string; dosage: string | null }>).map(med => `${med.name} ${med.dosage ?? ""}`.trim()),
      medsTakenCount: (medLogsRes.data ?? []).length,
      totalWorkoutMins: ((workoutsRes.data ?? []) as Array<{ duration_mins: number | null }>).reduce((sum, row) => sum + (row.duration_mins ?? 0), 0),
      breatherCount: ((sanctuaryRes.data ?? []) as Array<{ activity_type: string }>).filter(row => row.activity_type === "breather").length,
      // Journal content is excluded from the PDF until its storage and consent model is verified.
      journalNotes: [],
    };

    const buffer = await renderToBuffer(React.createElement(ReportDocument, { data: reportData }));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Getsanctos_Clinical_Report.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return jsonError("Unable to generate the report", 500);
  }
}