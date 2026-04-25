"use client";

import { useState, useEffect } from "react";
import styles from "./TopBar.module.css";

interface TopBarProps {
  status: "idle" | "loading" | "ready" | "error";
  driftKm: number;
  fuelSaving: number;
  shipName: string;
  onShipNameChange: (name: string) => void;
}

export default function TopBar({
  status,
  driftKm,
  fuelSaving,
  shipName,
  onShipNameChange,
}: TopBarProps) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setCurrentTime(new Date().toUTCString().slice(17, 25));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const statusMap = {
    idle: { label: "STANDBY", cls: "idle" },
    loading: { label: "COMPUTING", cls: "loading" },
    ready: { label: "NOMINAL", cls: "ready" },
    error: { label: "ERROR", cls: "error" },
  };
  const s = statusMap[status];

  return (
    <header className={styles.topbar}>
      {/* Brand */}
      <div className={styles.brand}>
        <span className={styles.logo}>⬡</span>
        <span className={`${styles.brandName} font-display`}>LATTICE</span>
        <span className={styles.brandSub}>Maritime Command Center</span>
      </div>

      {/* Status strip */}
      <div className={styles.statusStrip}>
        <div className={`${styles.statusPill} ${styles[`status-${s.cls}`]}`}>
          <span className={styles.statusDot} />
          {s.label}
        </div>

        <div className={styles.metric}>
          <span className={styles.metricLabel}>DRIFT</span>
          <span className={`${styles.metricValue} font-mono text-red`}>
            {driftKm > 0 ? `${driftKm.toFixed(2)} km` : "—"}
          </span>
        </div>

        <div className={styles.metric}>
          <span className={styles.metricLabel}>FUEL SAVING</span>
          <span className={`${styles.metricValue} font-mono text-green`}>
            {fuelSaving > 0 ? `+${fuelSaving.toFixed(1)}%` : "—"}
          </span>
        </div>

        <div className={styles.metric}>
          <span className={styles.metricLabel}>VESSEL</span>
          <input
            className={`${styles.shipInput} font-mono`}
            value={shipName}
            onChange={(e) => onShipNameChange(e.target.value)}
            maxLength={20}
          />
        </div>
      </div>

      {/* Right cluster */}
      <div className={styles.rightCluster}>
        <div className={styles.liveBadge}>
          <span className="dot-live" />
          <span className="font-mono" style={{ fontSize: 11, color: "var(--accent-green)" }}>
            LIVE
          </span>
        </div>
        <div className={`${styles.timeDisplay} font-mono`} suppressHydrationWarning>
          {currentTime ? `${currentTime} UTC` : "..."}
        </div>
      </div>
    </header>
  );
}
