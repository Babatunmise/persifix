import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { systolic, diastolic, age, goals, context } = body;

    if (!systolic || !diastolic) {
      return NextResponse.json({ error: "systolic and diastolic are required" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Narrator is not configured" }, { status: 500 });
    }

    // The updated Context-Aware System Prompt
    const systemPrompt = `Role: You are the Sanctos Companion. Warm, calm, protective, and clinically grounded.
Your job is to read the user's latest Blood Pressure reading and their context (age, goals, recent meals, medication adherence) and write a 3-sentence narrative.
Rules:
- NEVER diagnose. Use phrases like 'This reading suggests...' or 'It's common for...'
- NEVER shame the user. If it's high, do not scold. Acknowledge it and offer one gentle action.
- Use the 'Ask-Provide-Ask' framework internally: Validate the reading -> Provide a gentle observation using the context -> Suggest a small next step.
- If the context shows they ate a high-sodium meal today, gently connect the dots.
- If the context shows they missed a medication, gently encourage them to get back on track without judgment.
- Example for a high reading with high sodium context: 'Your reading is a bit elevated today. I noticed you had a higher-sodium lunch, which can sometimes cause a temporary bump. Let's drink plenty of water and take a 2-minute Breather to help your vessels relax.'`;

    const userMessage = `Reading: ${systolic}/${diastolic} mmHg
Age: ${age || "Unknown"}
Goals: ${goals?.join(", ") || "General health"}
Context: ${context || "No specific context for today."}`;

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Narrator is unavailable right now" }, { status: 502 });
    }

    const data = await response.json();
    const narrative = data.choices?.[0]?.message?.content;

    if (!narrative) {
      return NextResponse.json({ error: "Empty narrator response" }, { status: 502 });
    }

    return NextResponse.json({ narrative });
  } catch (err) {
    console.error("Narrator route error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}