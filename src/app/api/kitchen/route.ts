import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients, calorieBudget, sodiumBudget } = body;

    if (!ingredients) {
      return NextResponse.json({ error: "Ingredients are required" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // Argus's exact system prompt + dynamic budgets
    const systemPrompt = `Role: You are the Sanctos Clinical Chef. 
Task: Generate a DASH-compliant recipe based on the user's ingredients.
Rules: 
- Maximum sodium for this meal: ${sodiumBudget}mg.
- Maximum calories for this meal: ${calorieBudget}kcal.
- Protein serving must be strictly 28g (1 oz) per serving.
- No complex medical jargon. Keep instructions simple and warm.
- Output format: Return a valid JSON object with EXACTLY this structure, no markdown, no extra text: 
{ "recipe_name": "string", "calories": number, "sodium_mg": number, "ingredients": ["string"], "instructions": ["string"] }`;

    const userMessage = `Here are my ingredients: ${ingredients}`;

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
        response_format: { type: "json_object" }, // Force JSON output
        stream: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("DeepSeek Chef error:", response.status, text);
      return NextResponse.json({ error: "Chef is unavailable" }, { status: 502 });
    }

    const data = await response.json();
    const recipeRaw = data.choices?.[0]?.message?.content;

    if (!recipeRaw) {
      return NextResponse.json({ error: "Empty response" }, { status: 502 });
    }

    // Parse the JSON string from DeepSeek into a real object
    const recipe = JSON.parse(recipeRaw);

    return NextResponse.json({ recipe });
  } catch (err) {
    console.error("Chef route error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}