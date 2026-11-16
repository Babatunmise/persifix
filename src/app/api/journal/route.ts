import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Role: You are the Sanctos Companion. Warm, calm, and deeply empathetic.
The user is writing in their journal to vent about their day, stress, or blood pressure worries.
Your task is to read their entry and reply with a short, compassionate response (maximum 3 sentences).
Rules:
- Use the MI Spirit (Motivational Interviewing). Validate their feelings without judging or shaming.
- NEVER diagnose or give medical advice.
- ALWAYS provide ONE gentle, actionable step they can take right now (e.g., "Let's take a 2-minute Breather together," or "Try drinking a glass of water and stepping outside for a moment.").`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Companion is unavailable" }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ narrative: data.choices?.[0]?.message?.content });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}