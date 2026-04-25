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
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            maximumLevel: 16,
          })
        );

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

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingInner}>
            <div className={styles.spinner} />
            <span className="font-mono text-cyan" style={{ fontSize: 13 }}>
              CALCULATING OCEANIC TRAJECTORIES...
            </span>
          </div>
        </div>
      )}

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

