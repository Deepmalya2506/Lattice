"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Shipment, SimulationResponse } from "@/lib/types";
import styles from "./RouteControls.module.css";

interface RouteControlsProps {
  shipment: Shipment | null;
  onSearchMMSI: (mmsi: string) => void;
  onOptimize: () => void;
  simLevel: number;
  isLoading: boolean;
  simData: SimulationResponse | null;
}

export default function RouteControls({
  shipment,
  onSearchMMSI,
  onOptimize,
  simLevel,
  isLoading,
  simData,
}: RouteControlsProps) {
  const [mmsiInput, setMmsiInput] = useState("");

  const handleSearch = () => {
    if (mmsiInput.trim()) {
      onSearchMMSI(mmsiInput.trim());
    }
  };

  // Convert simData to chart format
  const getChartData = () => {
    if (!simData) return [];
    return simData.realized_path.map((_, i) => {
      const idealPt = simData.ideal_path[i];
      const realPt = simData.realized_path[i];
      let d = 0;
      if (idealPt && realPt) {
        // Approximate distance in km for the chart
        d = Math.sqrt(Math.pow(realPt[0] - idealPt[0], 2) + Math.pow(realPt[1] - idealPt[1], 2)) * 111.32;
      }
      return { step: i, drift: parseFloat(d.toFixed(2)) };
    });
  };

  return (
    <div className={styles.controls}>
      <div className={styles.searchBox}>
        <input
          type="text"
          className={`${styles.searchInput} input-field`}
          placeholder="Enter MMSI (e.g. 101234567)"
          value={mmsiInput}
          onChange={(e) => setMmsiInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button className={styles.searchBtn} onClick={handleSearch}>
          FIND
        </button>
      </div>

      <div className="divider" />

      {shipment ? (
        <>
          <div className={styles.profileCard}>
            <div className={styles.profileHeader}>
              <span className="font-display text-cyan" style={{ fontSize: 13 }}>
                {shipment.name}
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
                MMSI: {shipment.mmsi}
              </span>
            </div>
            
            <div className={styles.profileRow}>
              <span className={styles.profileLabel}>TYPE</span>
              <span className={styles.profileValue}>{shipment.type}</span>
            </div>
            <div className={styles.profileRow}>
              <span className={styles.profileLabel}>TONNAGE</span>
              <span className={styles.profileValue}>{shipment.tonnage.toLocaleString()} t</span>
            </div>
            <div className={styles.profileRow}>
              <span className={styles.profileLabel}>POWER</span>
              <span className={styles.profileValue}>{shipment.engine_power.toLocaleString()} kW</span>
            </div>

            <div className={styles.routePorts}>
              <span>{shipment.origin.name}</span>
              <span className={styles.routeArrow}>▶</span>
              <span>{shipment.destination.name}</span>
            </div>

            {shipment.geopolitics && (
              <div className={styles.riskWarning}>
                <div className={styles.riskIcon}>⚠️</div>
                <div className={styles.riskText}>
                  <span className={styles.riskRegion}>{shipment.geopolitics.region} RISK</span>
                  <span className={styles.riskDesc}>{shipment.geopolitics.event}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.actionGroup}>
            <button
              className={`btn btn-primary ${isLoading || simLevel > 0 ? styles.btnDisabled : ""}`}
              onClick={onOptimize}
              disabled={isLoading || simLevel > 0}
              style={{ justifyContent: "center", padding: "12px" }}
            >
              {isLoading ? (
                <><div className={styles.btnSpinner} /> OPTIMIZING...</>
              ) : simLevel > 0 ? (
                <>✓ ROUTE OPTIMIZED</>
              ) : (
                <>OPTIMIZE PATH</>
              )}
            </button>

            {simLevel === 2 && (
              <a 
                href={`/console?mmsi=${shipment.mmsi}`}
                className="btn btn-ghost"
                style={{ justifyContent: "center" }}
              >
                OPEN CAPTAIN'S CONSOLE
              </a>
            )}
          </div>

          {/* Embedded small drift graph */}
          {simData && (
            <div className={styles.driftGraphContainer} style={{ minHeight: 140 }}>
              <div className={styles.driftHeader}>PI-LSTM NEURAL INFERENCE DRIFT</div>
              
              <div className={styles.driftStat}>
                <span className={styles.statLabel}>PREDICTED DRIFT:</span>
                <span className={styles.statValue}>{simData.total_drift_km.toFixed(2)} KM</span>
              </div>

              <div style={{ height: 100, width: "100%", position: "relative", marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getChartData()} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDrift" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="step" hide />
                    <YAxis hide domain={[0, 'auto']} />
                    <Tooltip 
                      contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", fontSize: 10 }}
                      itemStyle={{ color: "#f87171" }}
                      formatter={(value: number) => [`${value} km`, 'Inference']}
                      labelFormatter={() => ''}
                    />
                    <Area type="monotone" dataKey="drift" stroke="#f87171" strokeWidth={2} fillOpacity={1} fill="url(#colorDrift)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: "10px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
          Search for an MMSI to view vessel profile.
        </div>
      )}
    </div>
  );
}
