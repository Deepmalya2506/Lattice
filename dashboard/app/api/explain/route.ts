import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { shipName, tonnage, enginePower, driftKm, uo, vo, startLat, startLon, endLat, endLon, geopolitics } =
    await req.json();

  const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  let model: any = null;
  let usedModelName = "";

  for (const modelName of MODELS) {
    try {
      model = genAI.getGenerativeModel({ model: modelName });
      // We don't know if it's available until we try to generate, but we'll try to pick one
      usedModelName = modelName;
      break;
    } catch (e) {
      console.warn(`Model ${modelName} unavailable, trying next...`);
    }
  }

  const prompt = `You are the Lattice Intelligence Core (Model: ${usedModelName}) acting as a Senior Maritime Analyst.

Ship: "${shipName ?? "MV-Alpha"}"
Voyage: (${startLat?.toFixed(2)}°) → (${endLat?.toFixed(2)}°)
Tonnage: ${tonnage} t
Predicted Drift: ${driftKm?.toFixed(2)} km
GBDELT Feed: ${geopolitics ?? "No alert"}

Provide a technical Captain's Log entry analyzing the PI-LSTM drift vs currents and regional risk.
Keep it authoritative and technical. Format with sections: **PHYSICS DRIFT**, **GEOPOLITICAL INTELLIGENCE**, **OPTIMIZATION RATIONALE**, **EFFICIENCY**.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let result;
        // Try models sequentially for the actual generation
        for (const mName of MODELS) {
          try {
            const m = genAI.getGenerativeModel({ model: mName });
            result = await m.generateContentStream(prompt.replace(usedModelName, mName));
            console.log(`[Explain] Successfully using ${mName}`);
            break;
          } catch (err) {
            console.warn(`[Explain] ${mName} failed, falling back...`);
          }
        }

        if (!result) throw new Error("All models failed.");

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err) {
        console.error("[/api/explain] Gemini error:", err);
        controller.enqueue(
          encoder.encode(
            "\n\n⚠️ AI analysis temporarily unavailable. Manual assessment required."
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
