import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import ReportDocument from "@/components/ReportDocument";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // Generate the PDF stream using React.createElement (no JSX)
    const stream = await renderToStream(
      React.createElement(ReportDocument, { data }) as any
    );

    // Convert Node stream to Web stream for Next.js
    return new NextResponse(stream as unknown as ReadableStream, {
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