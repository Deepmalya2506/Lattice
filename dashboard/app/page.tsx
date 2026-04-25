"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";
import HUDOverlay from "@/components/HUDOverlay";
import TelemetryChart from "@/components/TelemetryChart";
import RouteControls from "@/components/RouteControls";
import CaptainsLog from "@/components/CaptainsLog";
import type {
  LatLon,
  SimulationResponse,
  OptimizeResponse,
  TelemetryFeatures,
  DriftDataPoint,
} from "@/lib/types";
import styles from "./page.module.css";

// Cesium must be dynamically imported — it uses browser globals
const GlobeCanvas = dynamic(() => import("@/components/GlobeCanvas"), {
  ssr: false,
  loading: () => (
    <div className={styles.globePlaceholder}>
      <div className={styles.globeLoader}>
        <div className={styles.globeSpinner} />
        <span className="font-mono text-cyan" style={{ fontSize: 14 }}>
          INITIALIZING GLOBE ENGINE...
        </span>
      </div>
    </div>
  ),
});

const DEFAULT_START: LatLon = { lat: 48.8566, lon: 2.3522 };   // Paris
const DEFAULT_END: LatLon   = { lat: 40.7128, lon: -74.006 };  // NYC

export default function CommandCenter() {
  // ── Route state ──────────────────────────────────────────────────────────
  const [startPin, setStartPin] = useState<LatLon>(DEFAULT_START);
  const [endPin, setEndPin]     = useState<LatLon>(DEFAULT_END);
  const [tonnage, setTonnage]   = useState(2100);
  const [enginePower, setEngPow] = useState(800);
  const [shipName, setShipName] = useState("MV-LATTICE-01");

  // ── API response state ────────────────────────────────────────────────────
  const [simData, setSimData]     = useState<SimulationResponse | null>(null);
  const [optimData, setOptimData] = useState<OptimizeResponse | null>(null);
  const [isLoading, setLoading]  = useState(false);
  const [appStatus, setAppStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // ── Derived telemetry ─────────────────────────────────────────────────────
  const [driftChart, setDriftChart] = useState<DriftDataPoint[]>([]);
  const [currentFeatures, setCurrentFeatures] = useState<TelemetryFeatures | null>(null);
  const [animStep, setAnimStep] = useState(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Captain's Log trigger ─────────────────────────────────────────────────
  const [logPayload, setLogPayload] = useState<any>(null);

  // ── Run simulation ────────────────────────────────────────────────────────
  const runSimulation = useCallback(async () => {
    setLoading(true);
    setAppStatus("loading");
    setSimData(null);
    setOptimData(null);
    setDriftChart([]);
    setAnimStep(0);
    if (animRef.current) clearInterval(animRef.current);

    try {
      // Fire both requests in parallel
      const [simRes, optimRes] = await Promise.allSettled([
        fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_lat: startPin.lat,
            start_lon: startPin.lon,
            end_lat: endPin.lat,
            end_lon: endPin.lon,
            tonnage,
            engine_power: enginePower,
          }),
        }),
        fetch("/api/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_lat: startPin.lat,
            start_lon: startPin.lon,
            end_lat: endPin.lat,
            end_lon: endPin.lon,
            tonnage,
            engine_power: enginePower,
          }),
        }),
      ]);

      let sim: SimulationResponse | null = null;
      let optim: OptimizeResponse | null = null;

      if (simRes.status === "fulfilled" && simRes.value.ok) {
        sim = await simRes.value.json();
        setSimData(sim);
      }

      if (optimRes.status === "fulfilled" && optimRes.value.ok) {
        optim = await optimRes.value.json();
        if (optim && optim.optimized_path?.length > 0) {
          setOptimData(optim);
        }
      }

      if (sim) {
        // Build drift chart data
        const chartData: DriftDataPoint[] = sim.realized_path.map(
          ([lat, lon]: [number, number], i: number) => ({
            step: i,
            drift_km: sim!.ideal_path[i]
              ? Math.sqrt(
                  Math.pow(lat - sim!.ideal_path[i][0], 2) +
                    Math.pow(lon - sim!.ideal_path[i][1], 2)
                ) * 111.32
              : 0,
            lat,
            lon,
          })
        );
        setDriftChart(chartData);

        // Trigger Captain's Log
        setLogPayload({
          shipName,
          tonnage,
          enginePower,
          driftKm: sim.total_drift_km,
          uo: 0.15,
          vo: 0.05,
          startLat: startPin.lat,
          startLon: startPin.lon,
          endLat: endPin.lat,
          endLon: endPin.lon,
        });

        // Animate ship step-by-step through the realized path
        let step = 0;
        animRef.current = setInterval(() => {
          step++;
          if (step >= sim!.realized_path.length) {
            if (animRef.current) clearInterval(animRef.current);
            return;
          }
          setAnimStep(step);
          const [lat, lon] = sim!.realized_path[step];
          const [iLat, iLon] = sim!.ideal_path[step];
          setCurrentFeatures({
            curr_lat: lat,
            curr_lon: lon,
            dest_lat: endPin.lat,
            dest_lon: endPin.lon,
            tonnage,
            engine_power: enginePower,
            uo: 0.15 + Math.random() * 0.05,
            vo: 0.05 + Math.random() * 0.02,
            residual: Math.abs(lat - iLat) + Math.abs(lon - iLon),
          });
        }, 120);

        setAppStatus("ready");
      } else {
        setAppStatus("error");
      }
    } catch (err) {
      console.error("Simulation failed:", err);
      setAppStatus("error");
    } finally {
      setLoading(false);
    }
  }, [startPin, endPin, tonnage, enginePower, shipName]);

  // Auto-run on mount with default route
  useEffect(() => {
    const timer = setTimeout(() => runSimulation(), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, []);

  // ── JSON Export ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleExport = () => {
      if (!simData) {
        alert("No simulation data to export.");
        return;
      }
      const exportObj = {
        vessel: { shipName, tonnage, enginePower },
        route: { origin: startPin, destination: endPin },
        simulation: simData,
        optimization: optimData,
        timestamp: new Date().toISOString()
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href",     dataStr);
      downloadAnchorNode.setAttribute("download", `lattice_route_${shipName}_${Date.now()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    };
    
    window.addEventListener("exportJsonRequested", handleExport);
    return () => window.removeEventListener("exportJsonRequested", handleExport);
  }, [simData, optimData, shipName, startPin, endPin, tonnage, enginePower]);

  const handlePinsChange = useCallback(
    (start: LatLon, end: LatLon) => {
      setStartPin(start);
      setEndPin(end);
    },
    []
  );

  return (
    <div className={styles.root}>
      {/* ── Top navigation bar ─────────────────────────────────────────── */}
      <TopBar
        status={appStatus}
        driftKm={simData?.total_drift_km ?? 0}
        fuelSaving={optimData?.fuel_saving_pct ?? 0}
        shipName={shipName}
        onShipNameChange={setShipName}
      />

      {/* ── Main layout ───────────────────────────────────────────────── */}
      <div className={styles.layout}>

        {/* LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className={styles.leftSidebar}>
          <RouteControls
            tonnage={tonnage}
            enginePower={enginePower}
            onTonnageChange={setTonnage}
            onEnginePowerChange={setEngPow}
            onSimulate={runSimulation}
            isLoading={isLoading}
            optimFuelSaving={optimData?.fuel_saving_pct ?? 0}
          />

          <HUDOverlay
            features={currentFeatures}
            driftKm={simData?.total_drift_km ?? 0}
            step={animStep}
            totalSteps={simData?.realized_path?.length ?? 0}
            status={appStatus}
          />

          <TelemetryChart
            data={driftChart}
            optimizedBaseline={
              optimData && simData
                ? (simData.total_drift_km * (1 - optimData.fuel_saving_pct / 100))
                : undefined
            }
          />
        </aside>

        {/* GLOBE — center stage ─────────────────────────────────────────── */}
        <main className={styles.globeArea}>
          <GlobeCanvas
            simData={simData}
            optimData={optimData}
            onPinsChange={handlePinsChange}
            isLoading={isLoading}
          />
        </main>

        {/* RIGHT SIDEBAR — Captain's Log ────────────────────────────────── */}
        <aside className={`${styles.rightSidebar} glass-bright`}>
          <CaptainsLog triggerPayload={logPayload} />
        </aside>
      </div>
    </div>
  );
}
