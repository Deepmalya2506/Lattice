"use client";

import styles from "./RouteControls.module.css";

interface RouteControlsProps {
  tonnage: number;
  enginePower: number;
  onTonnageChange: (v: number) => void;
  onEnginePowerChange: (v: number) => void;
  onSimulate: () => void;
  isLoading: boolean;
  optimFuelSaving: number;
}

export default function RouteControls({
  tonnage,
  enginePower,
  onTonnageChange,
  onEnginePowerChange,
  onSimulate,
  isLoading,
  optimFuelSaving,
}: RouteControlsProps) {
  return (
    <div className={`${styles.controls} glass`}>
      <div className={styles.controlsTitle}>
        <span className="font-display" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--accent-cyan)" }}>
          ⬡ VESSEL PARAMETERS
        </span>
      </div>

      <div className="divider" />

      {/* Tonnage Slider */}
      <div className={styles.param}>
        <div className={styles.paramHeader}>
          <span className={styles.paramLabel}>TONNAGE</span>
          <span className={`${styles.paramValue} font-mono text-amber`}>
            {tonnage.toLocaleString()} t
          </span>
        </div>
        <input
          type="range"
          className="slider"
          min={500}
          max={15000}
          step={100}
          value={tonnage}
          onChange={(e) => onTonnageChange(Number(e.target.value))}
        />
        <div className={styles.paramRange}>
          <span>500t</span>
          <span>15,000t</span>
        </div>
      </div>

      {/* Engine Power Slider */}
      <div className={styles.param}>
        <div className={styles.paramHeader}>
          <span className={styles.paramLabel}>ENGINE POWER</span>
          <span className={`${styles.paramValue} font-mono text-amber`}>
            {enginePower.toLocaleString()} kW
          </span>
        </div>
        <input
          type="range"
          className="slider"
          min={500}
          max={8000}
          step={100}
          value={enginePower}
          onChange={(e) => onEnginePowerChange(Number(e.target.value))}
        />
        <div className={styles.paramRange}>
          <span>500 kW</span>
          <span>8,000 kW</span>
        </div>
      </div>

      <div className="divider" />

      {/* Efficiency indicator */}
      <div className={styles.efficiency}>
        <span className={styles.paramLabel}>T/P RATIO</span>
        <div className={styles.ratioBar}>
          <div
            className={styles.ratioFill}
            style={{
              width: `${Math.min(100, (tonnage / enginePower) * 10)}%`,
              background:
                tonnage / enginePower > 5
                  ? "var(--accent-red)"
                  : tonnage / enginePower > 2.5
                  ? "var(--accent-amber)"
                  : "var(--accent-green)",
            }}
          />
        </div>
        <span
          className="font-mono"
          style={{
            fontSize: 11,
            color:
              tonnage / enginePower > 5
                ? "var(--accent-red)"
                : tonnage / enginePower > 2.5
                ? "var(--accent-amber)"
                : "var(--accent-green)",
          }}
        >
          {(tonnage / enginePower).toFixed(2)} t/kW
        </span>
      </div>

      {optimFuelSaving > 0 && (
        <div className={styles.fuelSaving}>
          <span className={styles.fuelIcon}>⚡</span>
          <span className="font-mono text-green" style={{ fontSize: 12 }}>
            A* saves {optimFuelSaving.toFixed(1)}% fuel
          </span>
        </div>
      )}

      <div className="divider" />

      {/* Simulate button */}
      <button
        className={`btn btn-primary ${styles.simBtn}`}
        onClick={onSimulate}
        disabled={isLoading}
        id="simulate-btn"
      >
        {isLoading ? (
          <>
            <div className={styles.btnSpinner} />
            COMPUTING...
          </>
        ) : (
          <>⟁ RUN SIMULATION</>
        )}
      </button>

      {/* Export button */}
      <button
        className={`btn btn-ghost ${styles.simBtn}`}
        style={{ marginTop: "-4px" }}
        onClick={() => {
          const evt = new CustomEvent("exportJsonRequested");
          window.dispatchEvent(evt);
        }}
      >
        📥 EXPORT AS JSON
      </button>

      <div className={styles.hint}>
        Place pins on the globe, then run simulation to compute all three paths.
      </div>
    </div>
  );
}
