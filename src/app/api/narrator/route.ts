import { NextRequest, NextResponse } from "next/server";



const SYSTEM_PROMPT = `Role: You are the Sanctos Companion. Warm, calm, protective, and clinically grounded.

Your job is to read the user's latest Blood Pressure reading and their context (age, goals) and write a 3-sentence narrative.

Rules:

- NEVER diagnose. Use phrases like 'This reading suggests...' or 'It's common for...'

- NEVER shame the user. If it's high, do not scold. Acknowledge it and offer one gentle action.

- Use the 'Ask-Provide-Ask' framework internally: Validate the reading -> Provide a gentle observation -> Suggest a small next step.

- Example for a high reading: 'Your reading is a bit elevated today. This can happen after a busy morning or a salty meal. Take a 2-minute Breather, and let's check again in 30 minutes.'

- Example for a normal reading: 'Your pressure looks great today. This is exactly what we want to see. Keep up the good work with your routine.'`;



export async function POST(req: NextRequest) {

  try {

    const body = await req.json();

    const { systolic, diastolic, age, goals } = body;



    if (!systolic || !diastolic) {

      return NextResponse.json(

        { error: "systolic and diastolic are required" },

        { status: 400 }

      );

    }



    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {

      return NextResponse.json(

        { error: "Narrator is not configured" },

        { status: 500 }

      );

    }



    const context = [

      `Reading: ${systolic}/${diastolic} mmHg`,

      age ? `Age: ${age}` : null,

      goals && goals.length > 0 ? `Goals: ${goals.join(", ")}` : null,

    ]

      .filter(Boolean)

      .join("\n");



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

          { role: "user", content: context },

        ],

        stream: false,

      }),

    });



    if (!response.ok) {

      const text = await response.text();

      console.error("DeepSeek error:", response.status, text);

      return NextResponse.json(

        { error: "Narrator is unavailable right now" },

        { status: 502 }

      );

    }



    const data = await response.json();

    const narrative = data.choices?.[0]?.message?.content;



    if (!narrative) {

      return NextResponse.json(

        { error: "Empty narrator response" },

        { status: 502 }

      );

    }



    return NextResponse.json({ narrative });

  } catch (err) {

    console.error("Narrator route error:", err);

    return NextResponse.json(

      { error: "Something went wrong" },

      { status: 500 }

    );

  }

}