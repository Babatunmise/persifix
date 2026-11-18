import { NextRequest, NextResponse } from "next/server";

const SODIUM_DICTIONARY: Record<string, number> = {
  "salt": 2300, "table salt": 2300, "soy sauce": 900, "canned tomatoes": 400,
  "canned beans": 400, "chicken broth": 800, "beef broth": 800, "ground beef": 75,
  "chicken breast": 65, "bacon": 400, "cheese": 200, "bread": 150, "chips": 250,
  "ketchup": 160, "mayonnaise": 100, "chili seasoning packet": 1000, "olive oil": 0,
  "onion": 0, "garlic": 0, "spinach": 20, "broccoli": 30, "rice": 5, "pasta": 5,
  "butter": 50,
};

function calculateTotalSodium(ingredients: any[]): number {
  let total = 0;
  for (const ing of ingredients) {
    const name = ing.name.toLowerCase().trim();
    const amount = Number(ing.amount) || 1;
    const dictKey = Object.keys(SODIUM_DICTIONARY).find(k => name.includes(k));
    if (dictKey) total += SODIUM_DICTIONARY[dictKey] * amount;
    else total += 100 * amount; // Safe fallback
  }
  return Math.round(total);
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No chat history provided" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key missing" }, { status: 500 });

    const systemPrompt = `Role: You are the Sanctos DASH Guardian. A warm, smart, non-judgmental nutritionist and chef sitting in the user's kitchen.
Rules:
- NEVER recommend an ingredient the user does not have. (Zero Assumptions).
- The user will type naturally, messily, or give incomplete answers. Your job is to extract what you can and gently guide them. 
- If they say "I'm not sure" or give a vague answer, reassure them and probe further (e.g., "No problem at all! Canned beans have more sodium, but if they're dried, we can control it perfectly. How many servings are we making?").
- CULINARY CONTEXT: When the user names a dish (like "Chili", "Rice and Beans", "Spaghetti"), use your culinary knowledge to think about how it is typically made. Gently ask if they are adding typical components (proteins like meat/sausage, fats, or toppings like cheese/creams), without assuming they have them. 
  Example: "Rice and beans is such a great comfort meal! Are you adding any protein to it, like chicken or sausage? And are you topping it with anything like cheese or sour cream?"
- Ask ONE or TWO focused questions at a time. Do not interrogate them like a form.
- You must gather: the ingredients, their sodium context (fresh vs processed/canned), and how many servings this pot will last.

CRITICAL INSTRUCTION FOR FINAL OUTPUT:
DO NOT output JSON until you have all the information. Just chat normally like a human.
Once you have everything, write a brief, warm closing sentence, and then output the final plan as a strict JSON object. You MUST wrap the JSON in the exact tags ---PLAN_START--- and ---PLAN_END---.

Example of the final output:
"That sounds delicious! Here is your Guardian Plan.
---PLAN_START---
{
  "ingredients": [{"name": "ground beef", "amount": 1.5, "unit": "lb"}, {"name": "cheese", "amount": 0.5, "unit": "cup"}],
  "servings": 4,
  "pot_prep": "Use the whole seasoning packet, but do not add extra salt.",
  "plate_prep": "Fill 1 cupped hand with chili. Top with raw onions.",
  "closing_note": "Enjoy your dinner tonight!"
}
---PLAN_END---"`;
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
          ...messages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
        stream: false, // We removed response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error("DeepSeek API Error:", await response.text());
      return NextResponse.json({ error: "Guardian is offline" }, { status: 502 });
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    
    // Check if the AI has finished gathering info and generated the plan
    const planStart = rawContent.indexOf("---PLAN_START---");
    const planEnd = rawContent.indexOf("---PLAN_END---");

    if (planStart !== -1 && planEnd !== -1) {
      // Extract the JSON text between the tags
      const jsonString = rawContent.substring(planStart + 16, planEnd).trim();
      
      try {
        const aiResponse = JSON.parse(jsonString);
        
        // RUN THE DETERMINISTIC MATH ENGINE
        const totalPotSodium = calculateTotalSodium(aiResponse.ingredients || []);
        const servings = aiResponse.servings || 1;
        const sodiumPerServing = Math.round(totalPotSodium / servings);

        // Extract any conversational text before the tags to show in chat
        const textBeforePlan = rawContent.substring(0, planStart).trim();

        return NextResponse.json({
          status: "ready",
          message: textBeforePlan || "Here is your plan!",
          plan: {
            pot_prep: aiResponse.pot_prep,
            plate_prep: aiResponse.plate_prep,
            closing_note: aiResponse.closing_note,
          },
          estimated_sodium: sodiumPerServing,
          ingredients_list: aiResponse.ingredients, 
        });

      } catch (parseError) {
        console.error("Failed to parse final plan JSON:", jsonString);
        return NextResponse.json({
          status: "asking",
          message: "I have the plan in my head but I couldn't write it down properly. Can you tell me one more time what ingredients you used?"
        });
      }
    }

    // If the AI is still just chatting, return its natural text
    return NextResponse.json({
      status: "asking",
      message: rawContent,
    });

  } catch (err) {
    console.error("Kitchen Guardian Error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}