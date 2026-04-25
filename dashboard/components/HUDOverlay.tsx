"use client";

import styles from "./HUDOverlay.module.css";
import type { TelemetryFeatures } from "@/lib/types";

interface HUDOverlayProps {
  features: TelemetryFeatures | null;
  driftKm: number;
  step: number;
  totalSteps: number;
  status: "idle" | "loading" | "ready" | "error";
}

function FeatureRow({
  label,
  value,
  unit,
  color = "cyan",
  highlight = false,
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: "cyan" | "green" | "red" | "amber";
  highlight?: boolean;
}) {
  return (
    <div className={`${styles.featureRow} ${highlight ? styles.featureRowHighlight : ""}`}>
      <span className={styles.featureLabel}>{label}</span>
      <span className={`${styles.featureValue} font-mono text-${color}`}>
        {typeof value === "number" ? value.toFixed(4) : value}
        {unit && <span className={styles.featureUnit}>{unit}</span>}
      </span>
    </div>
  );
}

export default function HUDOverlay({ features, driftKm, step, totalSteps, status }: HUDOverlayProps) {
  const riskLevel =
    driftKm > 3 ? "HIGH" : driftKm > 1.5 ? "MEDIUM" : "LOW";
  const riskColor =
    driftKm > 3 ? "red" : driftKm > 1.5 ? "amber" : "green";

  return (
    <div className={`${styles.hud} glass`}>
      {/* Header */}
      <div className={styles.hudHeader}>
        <span className={`${styles.hudTitle} font-display`}>⬡ TELEMETRY</span>
        <div className={`badge badge-${riskColor === "red" ? "critical" : riskColor === "amber" ? "warning" : "nominal"}`}>
          RISK: {riskLevel}
        </div>
      </div>

      <div className="divider" />

      {/* Progress bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressLabel}>
          <span className="text-muted font-mono" style={{ fontSize: 10 }}>VOYAGE PROGRESS</span>
          <span className="font-mono text-cyan" style={{ fontSize: 11 }}>
            {step}/{totalSteps} pts
          </span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: totalSteps > 0 ? `${(step / totalSteps) * 100}%` : "0%" }}
          />
        </div>
      </div>

      <div className="divider" />

      {/* 9-feature vector */}
      <div className={styles.featureGrid}>
        <div className={styles.featureSection}>
          <div className={styles.featureSectionTitle}>POSITION</div>
          <FeatureRow label="LAT" value={features?.curr_lat ?? 0} unit="°" color="cyan" />
          <FeatureRow label="LON" value={features?.curr_lon ?? 0} unit="°" color="cyan" />
          <FeatureRow label="DEST LAT" value={features?.dest_lat ?? 0} unit="°" />
          <FeatureRow label="DEST LON" value={features?.dest_lon ?? 0} unit="°" />
        </div>

        <div className={styles.featureSection}>
          <div className={styles.featureSectionTitle}>VESSEL</div>
          <FeatureRow
            label="TONNAGE"
            value={(features?.tonnage ?? 0).toFixed(0)}
            unit=" t"
            color="amber"
          />
          <FeatureRow
            label="POWER"
            value={(features?.engine_power ?? 0).toFixed(0)}
            unit=" kW"
            color="amber"
          />
        </div>

        <div className={styles.featureSection}>
          <div className={styles.featureSectionTitle}>OCEAN VECTORS</div>
          <FeatureRow label="Uo (E→)" value={features?.uo ?? 0} unit=" m/s" color="green" />
          <FeatureRow label="Vo (N→)" value={features?.vo ?? 0} unit=" m/s" color="green" />
          <FeatureRow label="RESIDUAL" value={features?.residual ?? 0} color="green" />
        </div>
      </div>

      <div className="divider" />

      {/* Drift metric */}
      <div className={styles.driftDisplay}>
        <span className={styles.driftLabel}>CUMULATIVE DRIFT</span>
        <span
          className={`${styles.driftValue} font-display text-${riskColor}`}
          style={{ textShadow: driftKm > 0 ? `0 0 20px currentColor` : "none" }}
        >
          {driftKm.toFixed(3)} km
        </span>
      </div>
    </div>
  );
}
