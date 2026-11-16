import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Role: You are the Sanctos Companion. Warm, calm, and empathetic.
The user missed a dose of their blood pressure medication. You are NOT a doctor and cannot give medical advice.
Rules:
- If they forgot or ran out: Be supportive, tell them to take it as soon as they remember (unless it's almost time for the next dose), and gently suggest setting a reminder or refilling.
- If they felt dizzy: Tell them to sit down, drink water, and DO NOT take the missed dose. Tell them to contact their doctor if the dizziness continues.
- Maximum 2 sentences. Keep it brief, warm, and actionable.`;

export async function POST(req: NextRequest) {
  try {
    const { reason } = await req.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

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
          { role: "user", content: `I missed my medication because I ${reason}.` },
        ],
        stream: false,
      }),
    });

    const data = await response.json();
    return NextResponse.json({ narrative: data.choices?.[0]?.message?.content });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}