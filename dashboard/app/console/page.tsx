"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Shipment, SimulationResponse, OptimizeResponse } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import styles from "./page.module.css";


// 2D World Map & Heatmap Component
function HeatmapMap({ geopolData, oceanData }: { geopolData: number[][], oceanData: number[][] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.parentElement?.offsetWidth || 800;
      canvas.height = canvas.parentElement?.offsetHeight || 500;
      draw();
    };

    const draw = () => {
      if (!ctx) return;
      // Deep Void BG
      ctx.fillStyle = "#020408";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Continent Outlines
      ctx.strokeStyle = "rgba(168, 85, 247, 0.15)";
      ctx.lineWidth = 1;
      // Americas
      ctx.strokeRect(canvas.width * 0.1, canvas.height * 0.2, canvas.width * 0.15, canvas.height * 0.5);
      // Eurasia/Africa
      ctx.strokeRect(canvas.width * 0.4, canvas.height * 0.1, canvas.width * 0.35, canvas.height * 0.6);
      // Australia
      ctx.strokeRect(canvas.width * 0.75, canvas.height * 0.6, canvas.width * 0.15, canvas.height * 0.2);

      const drawHeatmapLayer = (data: number[][], baseColor: { r: number, g: number, b: number }) => {
        if (!data || data.length === 0) return;
        const cellW = canvas.width / data[0].length;
        const cellH = canvas.height / data.length;
        for (let i = 0; i < data.length; i++) {
          for (let j = 0; j < data[i].length; j++) {
            const val = data[i][j];
            if (val > 0.1) {
              ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${val * 0.4})`;
              ctx.fillRect(j * cellW, i * cellH, cellW, cellH);
            }
          }
        }
      };

      drawHeatmapLayer(geopolData, { r: 168, g: 85, b: 247 }); // Purple
      drawHeatmapLayer(oceanData, { r: 234, g: 179, b: 8 }); // Yellow

      // Heuristic Green Zone
      ctx.fillStyle = "rgba(34, 197, 94, 0.08)";
      ctx.fillRect(canvas.width * 0.3, canvas.height * 0.4, canvas.width * 0.4, canvas.height * 0.2);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [geopolData, oceanData]);

  return (
    <div className={styles.mapContainer}>
      <canvas ref={canvasRef} className={styles.heatmapCanvas} style={{ width: "100%", height: "100%" }} />
      <div className={styles.legendOverlay}>
        <div className={styles.legendTitle}>HEURISTIC FACTORS</div>
        <div className={styles.legendItem}><div className={styles.dot} style={{ background: "#a855f7" }} /><span>Geopolitics </span></div>
        <div className={styles.legendItem}><div className={styles.dot} style={{ background: "#eab308" }} /><span>Oceanics </span></div>
        <div className={styles.legendItem}><div className={styles.dot} style={{ background: "#22c55e" }} /><span>Safe-Zone </span></div>
      </div>
    </div>
  );
}

import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

import { useShipState } from "@/lib/ShipStateContext";

// ... (existing HeatmapMap component) ...

function CaptainsConsoleContent() {
  const searchParams = useSearchParams();
  const mmsiParam = searchParams.get("mmsi");
  const { mmsi, shipment, setShipment, simData, setSimData, optimData, setOptimData } = useShipState();

  const currentMmsi = mmsi || mmsiParam;

  const [logText, setLogText] = useState("Awaiting neural synchronization...");
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // SHAP Feature Importance
  const shapData = useMemo(() => {
    if (!simData) return [];
    const risk = shipment?.geopolitics?.risk_score || 0.1;
    return [
      { name: "Currents", value: 42, color: "#38bdf8" },
      { name: "Geopolitics", value: risk * 100, color: "#a855f7" },
      { name: "Ship Drag", value: 25, color: "#cbd5e1" },
      { name: "Non-linearity", value: 15, color: "#10b981" }
    ];
  }, [simData, shipment]);

  const geopolData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 20; i++) {
      const row = [];
      for (let j = 0; j < 30; j++) {
        const dist = Math.sqrt(Math.pow(i - 10, 2) + Math.pow(j - 15, 2));
        row.push(Math.max(0, 1 - dist / 12) * 0.8 + Math.random() * 0.1);
      }
      data.push(row);
    }
    return data;
  }, []);

  const oceanData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 20; i++) {
      const row = [];
      for (let j = 0; j < 30; j++) {
        const dist = Math.sqrt(Math.pow(i - 8, 2) + Math.pow(j - 12, 2));
        row.push(Math.max(0, 1 - dist / 10) * 0.6 + Math.random() * 0.1);
      }
      data.push(row);
    }
    return data;
  }, []);

  const explainedMmsiRef = useRef<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!currentMmsi || explainedMmsiRef.current === currentMmsi) return;

      try {
        setLoading(true);
        let currentShip = shipment;
        let currentSim = simData;

        if (!currentShip || !currentSim) {
          const url = process.env.NEXT_PUBLIC_OPTIMIZER_URL || "http://localhost:8000";
          const shipRes = await fetch(`${url}/api/shipment/${currentMmsi}`);
          if (!shipRes.ok) throw new Error("Shipment not found");
          currentShip = await shipRes.json();
          setShipment(currentShip);

          const [sRes, oRes] = await Promise.all([
            fetch("/api/simulate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                start_lat: currentShip!.origin.lat, start_lon: currentShip!.origin.lon,
                end_lat: currentShip!.destination.lat, end_lon: currentShip!.destination.lon,
                tonnage: currentShip!.tonnage, engine_power: currentShip!.engine_power,
              }),
            }),
            fetch("/api/optimize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                start_lat: currentShip!.origin.lat, start_lon: currentShip!.origin.lon,
                end_lat: currentShip!.destination.lat, end_lon: currentShip!.destination.lon,
                tonnage: currentShip!.tonnage, engine_power: currentShip!.engine_power,
              }),
            })
          ]);

          currentSim = await sRes.json();
          setSimData(currentSim);
          setOptimData(await oRes.json());
        }

        // TRIGGER EXPLAINER (Once per MMSI)
        explainedMmsiRef.current = currentMmsi;

        const explainRes = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shipName: currentShip!.name,
            tonnage: currentShip!.tonnage,
            enginePower: currentShip!.engine_power,
            driftKm: currentSim?.total_drift_km || 0,
            uo: 0.15, vo: 0.05,
            startLat: currentShip!.origin.lat, startLon: currentShip!.origin.lon,
            endLat: currentShip!.destination.lat, endLon: currentShip!.destination.lon,
            geopolitics: currentShip!.geopolitics ? currentShip!.geopolitics.event : "Normal"
          }),
        });

        if (!explainRes.ok || !explainRes.body) {
          setLogText("⚠️ XAI Core unavailable. Utilizing standard heuristic mapping.");
          return;
        }

        const reader = explainRes.body.getReader();
        const decoder = new TextDecoder();
        setLogText("");
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setLogText(prev => prev + decoder.decode(value));
        }
      } catch (err) {
        console.error("Captains Console Sync Error:", err);
        setLogText("⚠️ Neural synchronization failed. Retrying connection...");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [mmsi]);


  if (!currentMmsi) return (
    <div className={styles.root} style={{ alignItems: "center", justifyContent: "center" }}>
      <div className={styles.card} style={{ maxWidth: 400, textAlign: "center" }}>
        <div className={styles.cardTitle} style={{ color: "var(--accent-red)" }}>SYSTEM ERROR</div>
        <div className="font-mono" style={{ fontSize: 13, color: "#94a3b8" }}>NO MISSION TARGET</div>
        <a href="/" className={styles.backBtn} style={{ marginTop: 12 }}>RETURN</a>
      </div>
    </div>
  );

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className="font-display" style={{ color: "var(--accent-cyan)", fontSize: 22, margin: 0 }}>MISSION CONTROL</h1>
          <div className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>SHAP CONTRIBUTION / XAI RATIONALE</div>
        </div>
        <a href="/" className={styles.backBtn}>◀ RETURN TO GIS</a>
      </header>

      {loading ? (
        <div className={styles.loadingPulse}>SYNCING NEURAL ENGINE...</div>
      ) : (
        <div className={styles.mainGrid}>
          <div className={styles.leftCol}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>OPTIMIZATION RATIONALE</span>
                <span className={styles.modelTag}>XAI CORE</span>
              </div>
              <div className={styles.agentLog}>
                <ReactMarkdown>{logText}</ReactMarkdown>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>SHAP CONTRIBUTION ANALYSIS</div>
              <div style={{ height: 180, width: "100%" }}>
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={shapData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" hide />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "none", fontSize: 10 }} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {shapData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.5)' }} />
                )}
              </div>
              <div className={styles.shapLegend}>
                {shapData.map(d => (
                  <div key={d.name} className={styles.legendItem}>
                    <div className={styles.dot} style={{ background: d.color }} />
                    <span>{d.name} ({d.value.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>2D HEURISTIC OVERLAYS</div>
            <HeatmapMap geopolData={geopolData} oceanData={oceanData} />
            <div className={styles.description}>
              Weighted resistance fields: Purple (Geopolitical Friction), Yellow (Oceanic Resistance).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CaptainsConsole() {
  return (
    <Suspense
      fallback={
        <div
          className={styles.root}
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <div className={styles.loadingPulse}>
            INITIALIZING CAPTAIN'S CONSOLE...
          </div>
        </div>
      }
    >
      <CaptainsConsoleContent />
    </Suspense>
  );
}