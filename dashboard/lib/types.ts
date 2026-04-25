// ─── Shared Type Definitions for Lattice Dashboard ───────────────────────────

export interface LatLon {
  lat: number;
  lon: number;
}

export interface SimulationResponse {
  ideal_path: [number, number][];      // [lat, lon] pairs
  realized_path: [number, number][];   // [lat, lon] pairs — PI-LSTM drift
  total_drift_km: number;
  drift_per_step?: number[];
}

export interface OptimizeResponse {
  optimized_path: [number, number][];
  fuel_saving_pct: number;
  waypoints: number;
}

export interface TelemetryFeatures {
  curr_lat: number;
  curr_lon: number;
  dest_lat: number;
  dest_lon: number;
  tonnage: number;
  engine_power: number;
  uo: number;           // Eastward current (m/s)
  vo: number;           // Northward current (m/s)
  residual: number;     // Physics residual
}

export interface RouteRequest {
  start_lat: number;
  start_lon: number;
  end_lat: number;
  end_lon: number;
  tonnage: number;
  engine_power: number;
}

export interface CaptainsLogEntry {
  timestamp: string;
  message: string;
  type: "info" | "warning" | "critical" | "ai";
}

export interface DriftDataPoint {
  step: number;
  drift_km: number;
  lat: number;
  lon: number;
}

export interface Port {
  name: string;
  lat: number;
  lon: number;
  country: string;
}

export interface Geopolitics {
  region: string;
  risk_score: number;
  event: string;
}

export interface Shipment {
  mmsi: string;
  name: string;
  type: string;
  tonnage: number;
  engine_power: number;
  origin: Port;
  destination: Port;
  status: string;
  current_lat: number;
  current_lon: number;
  geopolitics: Geopolitics | null;
}
