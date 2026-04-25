"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLon, SimulationResponse, OptimizeResponse } from "@/lib/types";
import styles from "./GlobeCanvas.module.css";

interface GlobeCanvasProps {
  simData: SimulationResponse | null;
  optimData: OptimizeResponse | null;
  onPinsChange: (start: LatLon, end: LatLon) => void;
  isLoading: boolean;
}

declare global {
  interface Window {
    Cesium: typeof import("cesium");
    CESIUM_BASE_URL: string;
  }
}

let cesiumLoaded = false;

function loadCesiumScript(): Promise<void> {
  if (cesiumLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // Set base URL for Cesium assets and web workers
    window.CESIUM_BASE_URL = "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/";
    
    // Load Cesium from CDN
    const script = document.createElement("script");
    script.src = "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Cesium.js";
    script.onload = () => { cesiumLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GlobeCanvas({ simData, optimData, onPinsChange, isLoading }: GlobeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const entitiesRef = useRef<any[]>([]);
  const [cesiumReady, setCesiumReady] = useState(false);

  // Paris → NYC default pins
  const startRef = useRef<LatLon>({ lat: 48.8566, lon: 2.3522 });
  const endRef = useRef<LatLon>({ lat: 40.7128, lon: -74.006 });
  const [pinMode, setPinMode] = useState<"none" | "start" | "end">("none");
  const pinModeRef = useRef<"none" | "start" | "end">("none");
  
  // WMTS & Time states
  const [showOceanic, setShowOceanic] = useState(false);
  const [timeOffsetDays, setTimeOffsetDays] = useState(0); // 0 = today, -7 to +7

  useEffect(() => { pinModeRef.current = pinMode; }, [pinMode]);

  // ── Initialize Cesium Viewer ─────────────────────────────────────────────
  useEffect(() => {
    let viewer: any;
    (async () => {
      await loadCesiumScript();
      if (!containerRef.current || viewerRef.current) return;
      const Cesium = window.Cesium;

      // Ion token — replace with your own at cesium.com/ion
      Cesium.Ion.defaultAccessToken =
        process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5Y2ZiMzA2MC0yNTU3LTQzOWEtYTlmMS0yNjkwNmZkODcxMjkiLCJpZCI6MjkzMzMsInNjb3BlcyI6WyJhc2wiLCJhc3IiLCJhc3ciLCJnYyJdLCJpYXQiOjE1OTU4MDg0MTV9.6ixWajZuRbJMQzJFiRn0UHTM4lEz3L8JT7oBGnb9gzU";

      viewer = new Cesium.Viewer(containerRef.current, {
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        creditContainer: document.createElement("div"), // hide credits
      });

      // Dark space background
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#020408");
      viewer.scene.skyBox.show = true;
      viewer.scene.moon.show = false;

      // Dark imagery: use ArcGIS dark basemap via WMTS
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          credit: "Esri Dark Gray Canvas",
          maximumLevel: 16,
        })
      );

      // Atmosphere
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.0002;
      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.atmosphereLightIntensity = 10.0;

      // Post-Processing Bloom
      try {
        const bloom = viewer.scene.postProcessStages.bloom;
        if (bloom) {
          bloom.enabled = true;
          bloom.uniforms.glowOnly = false;
          bloom.uniforms.contrast = 128;
          bloom.uniforms.brightness = -0.3;
          bloom.uniforms.delta = 1.0;
          bloom.uniforms.sigma = 2.5;
          bloom.uniforms.stepSize = 1.0;
        }
      } catch (e) {
        console.warn("Bloom not supported", e);
      }

      viewerRef.current = viewer;
      setCesiumReady(true);

      // Camera: frame the North Atlantic
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-38, 48, 9_000_000),
        duration: 2.5,
      });

      // Click handler for pin placement
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((event: any) => {
        const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
        if (!cartesian) return;
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        const lat = Cesium.Math.toDegrees(carto.latitude);
        const lon = Cesium.Math.toDegrees(carto.longitude);
        const mode = pinModeRef.current;
        if (mode === "start") {
          startRef.current = { lat, lon };
          setPinMode("none");
          onPinsChange(startRef.current, endRef.current);
        } else if (mode === "end") {
          endRef.current = { lat, lon };
          setPinMode("none");
          onPinsChange(startRef.current, endRef.current);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    })();

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // ── Copernicus WMTS Layer Toggle ──────────────────────────────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return;
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;

    // Remove any existing oceanic layer (we add it as the second layer, index 1)
    if (viewer.imageryLayers.length > 1) {
      viewer.imageryLayers.remove(viewer.imageryLayers.get(1));
    }

    if (showOceanic) {
      // Mock Copernicus / GIBS layer for Sea Surface Velocity / Temp
      // We map the time scrubber to the TIME param in WMTS
      const isoDate = new Date(Date.now() + timeOffsetDays * 86400000).toISOString().split("T")[0];
      
      const oceanLayer = new Cesium.WebMapTileServiceImageryProvider({
        url: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?TIME=${isoDate}`,
        layer: "GHRSST_L4_MUR_Sea_Surface_Temperature",
        style: "default",
        format: "image/png",
        tileMatrixSetID: "250m",
        maximumLevel: 5,
        credit: "Copernicus/GIBS",
        alpha: 0.5,
      });
      viewer.imageryLayers.addImageryProvider(oceanLayer, 1);
    }
  }, [showOceanic, timeOffsetDays, cesiumReady]);

  // ── Render paths whenever simData / optimData changes ───────────────────
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return;
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;

    // Clear previous entities
    entitiesRef.current.forEach((e) => viewer.entities.remove(e));
    entitiesRef.current = [];

    const addPin = (lat: number, lon: number, label: string, color: any) => {
      const e = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        point: {
          pixelSize: 14,
          color,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: label,
          font: "12px 'Orbitron', sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -24),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
      });
      entitiesRef.current.push(e);
    };

    const addPolyline = (
      coords: [number, number][],
      color: any,
      width: number,
      isDashed = false
    ) => {
      if (!coords || coords.length < 2) return;
      const positions = coords.map(([lat, lon]) =>
        Cesium.Cartesian3.fromDegrees(lon, lat)
      );
      const e = viewer.entities.add({
        polyline: {
          positions,
          width,
          material: isDashed
            ? new Cesium.PolylineDashMaterialProperty({
                color,
                dashLength: 20,
                gapColor: Cesium.Color.TRANSPARENT,
              })
            : new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.25,
                color,
              }),
          clampToGround: false,
        },
      });
      entitiesRef.current.push(e);
    };

    // Start / End pins
    addPin(startRef.current.lat, startRef.current.lon, "ORIGIN", Cesium.Color.fromCssColorString("#00d4ff"));
    addPin(endRef.current.lat, endRef.current.lon, "DESTINATION", Cesium.Color.fromCssColorString("#ffb800"));

    if (simData) {
      // 🔵 Great Circle — blue glow
      addPolyline(
        simData.ideal_path,
        Cesium.Color.fromCssColorString("#1a6bff").withAlpha(0.8),
        3
      );

      // 🔴 Drift Path — red dashed glow
      addPolyline(
        simData.realized_path,
        Cesium.Color.fromCssColorString("#ff3355").withAlpha(0.9),
        4,
        true
      );

      // Ship entity on realized path end
      const endPt = simData.realized_path[simData.realized_path.length - 1];
      if (endPt) {
        const shipEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(endPt[1], endPt[0]),
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString("#ff3355"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: `⚓ DRIFT: ${simData.total_drift_km.toFixed(2)} km`,
            font: "11px 'JetBrains Mono', monospace",
            fillColor: Cesium.Color.fromCssColorString("#ff3355"),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -28),
          },
        });
        entitiesRef.current.push(shipEntity);
      }
    }

    // 🟢 Optimized path — green glow
    if (optimData && optimData.optimized_path?.length > 1) {
      addPolyline(
        optimData.optimized_path as [number, number][],
        Cesium.Color.fromCssColorString("#00ff88").withAlpha(0.9),
        3
      );
    }

    // Fly camera to frame the route
    if (simData && simData.ideal_path.length > 0) {
      const start = simData.ideal_path[0];
      const end = simData.ideal_path[simData.ideal_path.length - 1];
      const midLat = (start[0] + end[0]) / 2;
      const midLon = (start[1] + end[1]) / 2;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(midLon, midLat - 5, 7_500_000),
        duration: 2,
      });
    }
  }, [simData, optimData, cesiumReady]);

  return (
    <div className={styles.wrapper}>
      {/* Cesium mount point */}
      <div ref={containerRef} className={styles.cesiumContainer} />

      {/* Loading overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingInner}>
            <div className={styles.spinner} />
            <span className="font-mono text-cyan" style={{ fontSize: 13 }}>
              COMPUTING TRAJECTORY...
            </span>
          </div>
        </div>
      )}

      {/* Pin control buttons */}
      <div className={styles.pinControls}>
        <button
          className={`btn ${pinMode === "start" ? styles.btnActive : "btn-ghost"}`}
          onClick={() => setPinMode(pinMode === "start" ? "none" : "start")}
          title="Click globe to place origin"
        >
          📍 SET ORIGIN
        </button>
        <button
          className={`btn ${pinMode === "end" ? styles.btnActiveAmber : "btn-ghost"}`}
          onClick={() => setPinMode(pinMode === "end" ? "none" : "end")}
          title="Click globe to place destination"
        >
          🏁 SET DESTINATION
        </button>
      </div>

      {/* Timeline Scrubber & Layer Toggle */}
      <div className={styles.timeControlOverlay}>
        <div className={styles.timeHeader}>
          <span className="font-display" style={{ fontSize: 10, color: "var(--accent-cyan)", letterSpacing: "0.1em" }}>
            4D OCEANIC DATA
          </span>
          <button 
            className={`${styles.toggleBtn} ${showOceanic ? styles.toggleActive : ""}`}
            onClick={() => setShowOceanic(!showOceanic)}
          >
            {showOceanic ? "LAYER: ON" : "LAYER: OFF"}
          </button>
        </div>
        <div className={styles.scrubberContainer}>
          <span className="font-mono text-muted" style={{ fontSize: 10 }}>-7d</span>
          <input 
            type="range" 
            className="slider"
            min={-7} max={7} step={1}
            value={timeOffsetDays}
            onChange={(e) => setTimeOffsetDays(parseInt(e.target.value))}
            disabled={!showOceanic}
          />
          <span className="font-mono text-muted" style={{ fontSize: 10 }}>+7d</span>
        </div>
        <div className="font-mono text-center" style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
          T {timeOffsetDays >= 0 ? `+${timeOffsetDays}` : timeOffsetDays} DAYS
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendLine} style={{ background: "#1a6bff" }} />
          <span>Great Circle</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendLine} style={{ background: "#ff3355" }} />
          <span>Drift Path (PI-LSTM)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendLine} style={{ background: "#00ff88" }} />
          <span>Optimized (A*)</span>
        </div>
      </div>

      {/* Pin mode hint */}
      {pinMode !== "none" && (
        <div className={styles.pinHint}>
          Click on the globe to place{" "}
          <strong className={pinMode === "start" ? "text-cyan" : "text-amber"}>
            {pinMode === "start" ? "ORIGIN" : "DESTINATION"}
          </strong>
        </div>
      )}
    </div>
  );
}
