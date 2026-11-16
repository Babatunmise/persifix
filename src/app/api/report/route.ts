import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import ReportDocument from "@/components/ReportDocument";

// Force Node.js runtime (Edge doesn't support PDF generation)
export const runtime = 'nodejs'; 

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Generate the PDF as a Buffer (much safer for Serverless)
    const buffer = await renderToBuffer(
      React.createElement(ReportDocument, { data }) as any
    );

    return new NextResponse(buffer, {
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