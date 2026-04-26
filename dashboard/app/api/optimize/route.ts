import { NextRequest, NextResponse } from "next/server";

const OPTIMIZER_URL = process.env.NEXT_PUBLIC_OPTIMIZER_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const upstream = await fetch(`${OPTIMIZER_URL}/optimize_route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });

    if (!upstream.ok) {
      // Return a graceful fallback so the dashboard still renders
      return NextResponse.json(
        { error: "Optimizer unavailable", optimized_path: [], fuel_saving_pct: 0 },
        { status: 200 }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/optimize] error:", err);
    // Optimizer is optional — don't crash the dashboard
    return NextResponse.json(
      { error: "Optimizer offline", optimized_path: [], fuel_saving_pct: 0 },
      { status: 200 }
    );
  }
}
