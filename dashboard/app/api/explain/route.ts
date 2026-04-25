import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { shipName, tonnage, enginePower, driftKm, uo, vo, startLat, startLon, endLat, endLon } =
    await req.json();

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `You are a Senior Maritime Engineer and AI analyst for the Lattice Maritime Intelligence Platform.

Ship: "${shipName ?? "MV-Alpha"}"
Voyage: (${startLat?.toFixed(2)}°, ${startLon?.toFixed(2)}°) → (${endLat?.toFixed(2)}°, ${endLon?.toFixed(2)}°)
Tonnage: ${tonnage} metric tons
Engine Power: ${enginePower} kW
Predicted Drift: ${driftKm?.toFixed(2)} km
Ocean Current Vectors: U (Eastward) = ${uo?.toFixed(3)} m/s, V (Northward) = ${vo?.toFixed(3)} m/s

As the Lattice AI, provide a technical Captain's Log entry that:
1. Explains the physics behind the predicted ${driftKm?.toFixed(2)} km drift using the U and V current vectors.
2. Assesses the risk level (LOW / MEDIUM / HIGH) based on tonnage-to-power ratio.
3. Recommends whether engine power should be increased or if route correction is needed.
4. Mentions any fuel efficiency opportunities given the current direction.

Keep the tone authoritative and technical. Format with clear sections: **DRIFT ANALYSIS**, **RISK ASSESSMENT**, **RECOMMENDATION**, **EFFICIENCY NOTE**. Use nautical terminology.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await model.generateContentStream(prompt);
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
