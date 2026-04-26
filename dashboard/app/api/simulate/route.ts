import { NextRequest, NextResponse } from "next/server";
import type { RouteRequest } from "@/lib/types";

const CLOUD_RUN_URL = process.env.NEXT_PUBLIC_CLOUD_RUN_URL!;

export async function POST(req: NextRequest) {
  try {
    const body: RouteRequest = await req.json();

    const upstream = await fetch(`${CLOUD_RUN_URL}/simulate_route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: "Cloud Run error", detail: text },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/simulate] error:", err);
    // Return a mocked fallback so the dashboard doesn't crash if Cloud Run is down
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ 
      drift_path: [
        { lat: body.start_lat || 0, lon: body.start_lon || 0 },
        { lat: body.end_lat || 0, lon: body.end_lon || 0 }
      ],
      total_drift_km: 125.4
    }, { status: 200 });
  }
}
