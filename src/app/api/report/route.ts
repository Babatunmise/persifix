import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import ReportDocument from "@/components/ReportDocument";

export const runtime = 'nodejs'; 

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const buffer = await renderToBuffer(
      React.createElement(ReportDocument, { data }) as any
    );

    // The fix is right here: wrapping in Uint8Array
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="Getsanctos_Clinical_Report.pdf"',
      },
    });
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}