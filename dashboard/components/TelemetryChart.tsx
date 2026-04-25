"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import type { DriftDataPoint } from "@/lib/types";
import styles from "./TelemetryChart.module.css";

interface TelemetryChartProps {
  data: DriftDataPoint[];
  optimizedBaseline?: number; // avg drift if optimized path used
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className={styles.tooltip}>
        <div className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
          STEP {label}
        </div>
        <div className="font-mono text-red" style={{ fontSize: 13, fontWeight: 600 }}>
          {payload[0]?.value?.toFixed(3)} km drift
        </div>
      </div>
    );
  }
  return null;
};

export default function TelemetryChart({ data, optimizedBaseline }: TelemetryChartProps) {
  const maxDrift = data.length > 0 ? Math.max(...data.map((d) => d.drift_km)) : 0;
  const avgDrift =
    data.length > 0 ? data.reduce((a, b) => a + b.drift_km, 0) / data.length : 0;

  return (
    <div className={`${styles.chartContainer} glass`}>
      <div className={styles.chartHeader}>
        <span className={`${styles.chartTitle} font-display`}>⟁ DRIFT vs TIME</span>
        <div className={styles.chartStats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>PEAK</span>
            <span className="font-mono text-red" style={{ fontSize: 12 }}>
              {maxDrift.toFixed(2)} km
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>AVG</span>
            <span className="font-mono text-amber" style={{ fontSize: 12 }}>
              {avgDrift.toFixed(2)} km
            </span>
          </div>
          {optimizedBaseline !== undefined && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>OPT</span>
              <span className="font-mono text-green" style={{ fontSize: 12 }}>
                {optimizedBaseline.toFixed(2)} km
              </span>
            </div>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div className={styles.emptyState}>
          <span className="text-muted font-mono" style={{ fontSize: 11 }}>
            Awaiting simulation data...
          </span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff3355" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff3355" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,212,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="step"
              tick={{ fill: "var(--text-muted)", fontSize: 9, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "var(--border-subtle)" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 9, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Average drift reference line */}
            {avgDrift > 0 && (
              <ReferenceLine
                y={avgDrift}
                stroke="rgba(255,184,0,0.4)"
                strokeDasharray="4 4"
                label={{
                  value: "AVG",
                  position: "right",
                  fill: "var(--accent-amber)",
                  fontSize: 9,
                  fontFamily: "JetBrains Mono",
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="drift_km"
              stroke="#ff3355"
              strokeWidth={2}
              fill="url(#driftGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#ff3355",
                stroke: "white",
                strokeWidth: 1.5,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
