"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import RouteControls from "@/components/RouteControls";
import type {
  SimulationResponse,
  OptimizeResponse,
  Shipment
} from "@/lib/types";
import styles from "./page.module.css";

import { useShipState } from "@/lib/ShipStateContext";

// Cesium must be dynamically imported
const GlobeCanvas = dynamic(() => import("@/components/GlobeCanvas"), {
  ssr: false,
  loading: () => (
    <div className={styles.globePlaceholder}>
      <div className={styles.globeLoader}>
        <div className={styles.globeSpinner} />
        <span className="font-display text-muted" style={{ fontSize: 13 }}>
          INITIALIZING 4D GIS ENGINE
        </span>
      </div>
    </div>
  ),
});

export default function CommandCenter() {
  const { mmsi, setMmsi, shipment: currentShipment, setShipment: setCurrentShipment, simData, setSimData, optimData, setOptimData } = useShipState();
  
  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [simLevel, setSimLevel] = useState<number>(0);
  const [isLoading, setLoading] = useState(false);

  // 1. Load Map of Trade on mount
  useEffect(() => {
    async function fetchMapOfTrade() {
      try {
        const url = process.env.NEXT_PUBLIC_OPTIMIZER_URL || "http://localhost:8000";
        const res = await fetch(`${url}/api/shipments`);
        if (res.ok) {
          const data = await res.json();
          setAllShipments(data.shipments);
        }
      } catch (err) {
        console.error("Failed to load map of trade:", err);
      }
    }
    fetchMapOfTrade();
  }, []);

  // 2. Handle MMSI Search
  const handleSearchMMSI = useCallback(async (mmsiStr: string) => {
    setLoading(true);
    setSimLevel(0);
    setSimData(null);
    setOptimData(null);
    setMmsi(mmsiStr);

    try {
      const url = process.env.NEXT_PUBLIC_OPTIMIZER_URL || "http://localhost:8000";
      const res = await fetch(`${url}/api/shipment/${mmsiStr}`);
      if (res.ok) {
        const ship = await res.json();
        setCurrentShipment(ship);
      } else {
        alert(`MMSI ${mmsiStr} not found in Knowledge Graph.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Single Button: Simulate Drift & Optimize
  const handleSimulateAndOptimize = useCallback(async () => {
    if (!currentShipment) return;
    setLoading(true);
    
    try {
      // Step 1: Analyze Drift
      const simRes = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_lat: currentShipment.origin.lat,
          start_lon: currentShipment.origin.lon,
          end_lat: currentShipment.destination.lat,
          end_lon: currentShipment.destination.lon,
          tonnage: currentShipment.tonnage,
          engine_power: currentShipment.engine_power,
        }),
      });

      if (simRes.ok) {
        const sim = await simRes.json();
        setSimData(sim);
        setSimLevel(1);

        // Step 2: Optimize
        const optRes = await fetch("/api/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start_lat: currentShipment.origin.lat,
            start_lon: currentShipment.origin.lon,
            end_lat: currentShipment.destination.lat,
            end_lon: currentShipment.destination.lon,
            tonnage: currentShipment.tonnage,
            engine_power: currentShipment.engine_power,
          }),
        });

        if (optRes.ok) {
          const optim = await optRes.json();
          setOptimData(optim);
          setSimLevel(2);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentShipment]);

  return (
    <div className={styles.root}>
      {/* FULL SCREEN GLOBE */}
      <main className={styles.globeArea}>
        <GlobeCanvas
          allShipments={allShipments}
          currentShipment={currentShipment}
          simData={simData}
          optimData={optimData}
          simLevel={simLevel}
          isLoading={isLoading}
        />
      </main>

      {/* OVERLAY CONTROLS (Top Right) */}
      <aside className={styles.controlsOverlay}>
        <RouteControls
          shipment={currentShipment}
          onSearchMMSI={handleSearchMMSI}
          onOptimize={handleSimulateAndOptimize}
          simLevel={simLevel}
          isLoading={isLoading}
          simData={simData}
        />
      </aside>
    </div>
  );
}
