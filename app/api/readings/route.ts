import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { evaluate, getCategory } from "@/features/bp-interpreter/domain/evaluate";
import type { Medication } from "@/features/bp-interpreter/domain/types";

export async function POST(req: Request) {
  try {
    // 1. Authenticate the user via the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    // 2. Connect to Supabase securely using the service_role key
    const supabase = createServerClient();
    
    // Verify the user's token is valid
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Parse the incoming data
    const body = await req.json();
    const { systolic, diastolic, medication } = body;

    // 4. Basic server-side validation (Never trust the client)
    if (
      typeof systolic !== "number" || 
      typeof diastolic !== "number" || 
      systolic <= diastolic ||
      systolic < 40 || systolic > 300 ||
      diastolic < 20 || diastolic > 200
    ) {
      return NextResponse.json({ error: "Invalid blood pressure values" }, { status: 400 });
    }

    // 5. Recompute the clinical math on the server (Defense in Depth)
    // This guarantees that no matter what the UI says, the database gets the strict ACC/AHA truth.
    const category = getCategory(systolic, diastolic);
    
    // 6. Save to the database securely
    const { data, error: dbError } = await supabase
      .from("readings")
      .insert({
        id: crypto.randomUUID(), // Generate a unique ID
        user_id: user.id,        // Link to the anonymous user
        systolic,
        diastolic,
        taken_at: new Date().toISOString(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        context: { 
          medication,
          serverCategory: category // Store the verified clinical category for the Doctor Report later
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB Error:", dbError);
      return NextResponse.json({ error: "Failed to save reading" }, { status: 500 });
    }

    return NextResponse.json({ success: true, reading: data });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}