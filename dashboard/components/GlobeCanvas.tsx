"use client";

import { useEffect, useRef, useState } from "react";
import type { Shipment, SimulationResponse, OptimizeResponse } from "@/lib/types";
import styles from "./GlobeCanvas.module.css";

interface GlobeCanvasProps {
  allShipments: Shipment[];
  currentShipment: Shipment | null;
  simData: SimulationResponse | null;
  optimData: OptimizeResponse | null;
  simLevel: number;
  isLoading: boolean;
  activeLayerOverride?: string;
}

declare global {
  interface Window {
    Cesium: typeof import("cesium");
    CESIUM_BASE_URL: string;
  }
}

let cesiumLoaded = false;
const CESIUM_VERSION = "1.114.0";
const CESIUM_URL = `https://unpkg.com/cesium@${CESIUM_VERSION}/Build/Cesium/`;

function loadCesiumScript(): Promise<void> {
  if (window.Cesium || cesiumLoaded) {
    cesiumLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    window.CESIUM_BASE_URL = CESIUM_URL;
    const script = document.createElement("script");
    script.src = `${CESIUM_URL}Cesium.js`;
    script.onload = () => { cesiumLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);

    // Also load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${CESIUM_URL}Widgets/widgets.css`;
    document.head.appendChild(link);
  });
}

// Map layer configs
const LAYERS = {
  NONE: null,
  WAVE: {
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi",
    layer: "SMAP_L4_Wind_Speed", // Mock wave height using wind speed
  },
  TEMP: {
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi",
    layer: "GHRSST_L4_MUR_Sea_Surface_Temperature",
  },
};

export default function GlobeCanvas({
  allShipments,
  currentShipment,
  simData,
  optimData,
  simLevel,
  isLoading,
  activeLayerOverride
}: GlobeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const entitiesRef = useRef<any[]>([]);
  const [cesiumReady, setCesiumReady] = useState(false);

  // 4D Layer State
  const [activeLayer, setActiveLayer] = useState<string>(activeLayerOverride || "NONE");
  const [timeOffsetDays, setTimeOffsetDays] = useState(0);
  const [drilledPoint, setDrilledPoint] = useState<{lat: number, lon: number, temp: number, wave: number} | null>(null);

  // ── Initialize Cesium Viewer ─────────────────────────────────────────────
  useEffect(() => {
    let viewer: any;
    let handler: any;
    let isDestroyed = false;

    const init = async () => {
      await loadCesiumScript();
      if (isDestroyed || !containerRef.current || viewerRef.current) return;
      
      const Cesium = window.Cesium;
      Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";

      try {
        viewer = new Cesium.Viewer(containerRef.current, {
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: document.createElement("div"),
          requestRenderMode: true, // SAVE WEBGL CONTEXTS
          maximumRenderTimeChange: Infinity,
        });

        viewer.scene.backgroundColor = Cesium.Color.BLACK;
        viewer.scene.globe.baseColor = Cesium.Color.BLACK;
        
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
            maximumLevel: 10,
          })
        );

        handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((click: any) => {
          const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            setDrilledPoint({
              lat, lon,
              temp: 15 + Math.random() * 10,
              wave: 1 + Math.random() * 5
            });
          } else {
            setDrilledPoint(null);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        
        viewerRef.current = viewer;
        setCesiumReady(true);
      } catch (err) {
        console.error("Cesium Init Error:", err);
      }
    };

    init();

    return () => {
      isDestroyed = true;
      if (handler) handler.destroy();
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // 4D Layer Management (Procedural Dynamic Overlays)
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return;
    const viewer = viewerRef.current;
    const Cesium = window.Cesium;

    // Clear old 4D layers (keep base at index 0)
    while (viewer.imageryLayers.length > 1) {
      viewer.imageryLayers.remove(viewer.imageryLayers.get(1));
    }

    if (activeLayer === "NONE") return;

    // Generate dynamic heatmap using HTML5 Canvas
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      const timeOffset = timeOffsetDays * 0.15; // Animation speed based on slider
      const imgData = ctx.createImageData(canvas.width, canvas.height);
      const data = imgData.data;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          // Procedural wave/temp noise
          let val = Math.sin(x * 0.05 + timeOffset) * Math.cos(y * 0.05 - timeOffset) 
                  + Math.sin(x * 0.02) * Math.cos(y * 0.02);
          val = (val + 2) / 4; // Normalize to 0-1
          
          // Fade out near the poles to make it look nicer
          const latDist = Math.abs((y / canvas.height) * 2 - 1);
          const alpha = Math.max(0, 1 - latDist * 1.2) * 0.5 * 255;

          const idx = (y * canvas.width + x) * 4;
          
          if (activeLayer === "TEMP" || activeLayer === "ALL") {
            // Cold to Warm (Blue to Red)
            data[idx] = Math.floor(val * 255);     // R
            data[idx + 1] = 50;                    // G
            data[idx + 2] = Math.floor((1 - val) * 255); // B
            data[idx + 3] = alpha;                 // A
          } else if (activeLayer === "WAVE") {
            // Wave intensity (Cyan/White to Dark Blue)
            data[idx] = Math.floor(val * 100);     // R
            data[idx + 1] = Math.floor(val * 255); // G
            data[idx + 2] = 200 + Math.floor(val * 55); // B
            data[idx + 3] = alpha * 0.7;           // A
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);

      const dynamicProvider = new Cesium.SingleTileImageryProvider({
        url: canvas.toDataURL(),
        rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90)
      });
      
      const layer = viewer.imageryLayers.addImageryProvider(dynamicProvider);
      layer.alpha = 0.6; // Blend with ocean base
    }
  }, [activeLayer, timeOffsetDays, cesiumReady]);

  // ── Render Entities ─────────────────────────────────────────────────────
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
          pixelSize: 8,
          color,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.7),
          outlineWidth: 1,
        },
        label: {
          text: label,
          font: "10px sans-serif",
          fillColor: Cesium.Color.WHITE,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -15),
        },
      });
      entitiesRef.current.push(e);
    };

    const addPolyline = (coords: [number, number][], color: any, width: number, isDashed = false) => {
      if (!coords || coords.length < 2) return;
      const positions = coords.map(([lat, lon]) => Cesium.Cartesian3.fromDegrees(lon, lat));
      const e = viewer.entities.add({
        polyline: {
          positions,
          width,
          material: isDashed
            ? new Cesium.PolylineDashMaterialProperty({ color, dashLength: 16 })
            : color,
        },
      });
      entitiesRef.current.push(e);
    };

    if (!currentShipment) {
      allShipments.forEach((ship) => {
        addPin(ship.origin.lat, ship.origin.lon, ship.origin.name, Cesium.Color.SKYBLUE);
        addPin(ship.destination.lat, ship.destination.lon, ship.destination.name, Cesium.Color.GOLD);
        addPolyline([
          [ship.origin.lat, ship.origin.lon],
          [ship.destination.lat, ship.destination.lon]
        ], Cesium.Color.WHITE.withAlpha(0.1), 1);
      });
    } else {
      addPin(currentShipment.origin.lat, currentShipment.origin.lon, "START", Cesium.Color.SKYBLUE);
      addPin(currentShipment.destination.lat, currentShipment.destination.lon, "DEST", Cesium.Color.GOLD);

      const ideal = simData?.ideal_path || [
        [currentShipment.origin.lat, currentShipment.origin.lon],
        [currentShipment.destination.lat, currentShipment.destination.lon]
      ];
      addPolyline(ideal, Cesium.Color.CORNFLOWERBLUE, 2);

      if (simLevel >= 1 && simData) {
        addPolyline(simData.realized_path, Cesium.Color.LIGHTCORAL, 3, true);
      }

      if (simLevel === 2 && optimData) {
        addPolyline(optimData.optimized_path as [number, number][], Cesium.Color.SPRINGGREEN, 4);
      }

      const midLat = (currentShipment.origin.lat + currentShipment.destination.lat) / 2;
      const midLon = (currentShipment.origin.lon + currentShipment.destination.lon) / 2;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(midLon, midLat, 6_000_000),
        duration: 1.5,
      });
    }

  }, [allShipments, currentShipment, simData, optimData, simLevel, cesiumReady]);

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.cesiumContainer} />

      {/* DRILL-DOWN POPUP */}
      {drilledPoint && (
        <div className={styles.drillPopup} style={{ left: 20, bottom: 20 }}>
          <div className={styles.drillHeader}>
            <span>POI: {drilledPoint.lat.toFixed(3)}°, {drilledPoint.lon.toFixed(3)}°</span>
            <button onClick={() => setDrilledPoint(null)}>×</button>
          </div>
          <div className={styles.drillBody}>
            <div className={styles.metric}>
              <span className={styles.label}>TEMP</span>
              <span className={styles.value}>{drilledPoint.temp.toFixed(1)}°C</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.label}>WAVES</span>
              <span className={styles.value}>{drilledPoint.wave.toFixed(1)}m</span>
            </div>
            <div className={styles.miniChart}>
              {/* Simplified temporal visualization */}
              <div className={styles.chartBar} style={{ height: "40%" }} />
              <div className={styles.chartBar} style={{ height: "60%" }} />
              <div className={styles.chartBar} style={{ height: "80%" }} />
              <div className={styles.chartBar} style={{ height: "70%" }} />
              <div className={styles.chartBar} style={{ height: "50%" }} />
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingInner}>
            <div className={styles.spinner} />
            <span className="font-mono text-cyan" style={{ fontSize: 13 }}>
              SYNCING 4D OCEANICS...
            </span>
          </div>
        </div>
      )}

      {/* 4D Ocean Control Panel */}
      <div className={styles.oceanControlPanel}>
        <div className={styles.panelTitle}>OCEAN DYNAMICS</div>
        <div className={styles.layerSelect}>
          <button className={`${styles.layerBtn} ${activeLayer === "NONE" ? styles.activeLayer : ""}`} onClick={() => setActiveLayer("NONE")}>NONE</button>
          <button className={`${styles.layerBtn} ${activeLayer === "TEMP" ? styles.activeLayer : ""}`} onClick={() => setActiveLayer("TEMP")}>TEMPERATURE</button>
          <button className={`${styles.layerBtn} ${activeLayer === "WAVE" ? styles.activeLayer : ""}`} onClick={() => setActiveLayer("WAVE")}>WAVES/WIND</button>
        </div>
        
        {activeLayer !== "NONE" && (
          <div className={styles.scrubberContainer}>
            <input 
              type="range" className="slider" min={-14} max={14} step={1}
              value={timeOffsetDays} onChange={(e) => setTimeOffsetDays(parseInt(e.target.value))}
            />
            <div className="font-mono text-center text-muted" style={{ fontSize: 10, marginTop: 4 }}>
              T {timeOffsetDays >= 0 ? `+${timeOffsetDays}` : timeOffsetDays} DAYS
            </div>
            
            <div className={styles.heatmapLegend}>
              <div className={styles.legendGradient} style={{
                background: activeLayer === "TEMP" 
                  ? "linear-gradient(to right, #313695, #4575b4, #abd9e9, #ffffbf, #fdae61, #a50026)"
                  : "linear-gradient(to right, #ffffff, #addd8e, #238443, #005a32)"
              }} />
              <div className={styles.legendLabels}>
                <span>MIN</span>
                <span>MAX</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendLine} style={{ background: "var(--accent-blue)" }} />
          <span>Planned</span>
        </div>
        {simLevel >= 1 && (
          <div className={styles.legendItem}>
            <div className={styles.legendLine} style={{ background: "var(--accent-red)", opacity: 0.6 }} />
            <span>Drift (PI-LSTM)</span>
          </div>
        )}
        {simLevel >= 2 && (
          <div className={styles.legendItem}>
            <div className={styles.legendLine} style={{ background: "var(--accent-green)" }} />
            <span>Optimized</span>
          </div>
        )}
      </div>
    </div>
  );
}

