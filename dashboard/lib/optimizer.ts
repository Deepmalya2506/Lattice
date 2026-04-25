/**
 * A* Path Optimizer — server-side TypeScript implementation.
 * All heavy computation stays Python-side. This module provides
 * helpers to call the Python optimizer service and post-process results.
 */

import type { LatLon, OptimizeResponse } from "./types";

const OPTIMIZER_URL = process.env.NEXT_PUBLIC_OPTIMIZER_URL ?? "http://localhost:8001";

/** Haversine distance in km between two lat/lon points */
export function haversineKm(a: LatLon, b: LatLon): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinDlat * sinDlat +
          Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDlon * sinDlon
      )
    );
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Call Python A* optimizer service */
export async function fetchOptimizedPath(
  start: LatLon,
  end: LatLon,
  tonnage: number,
  enginePower: number
): Promise<OptimizeResponse | null> {
  try {
    const res = await fetch(`${OPTIMIZER_URL}/optimize_route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_lat: start.lat,
        start_lon: start.lon,
        end_lat: end.lat,
        end_lon: end.lon,
        tonnage,
        engine_power: enginePower,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Generate a great-circle path (client-side fallback for display only) */
export function greatCirclePath(start: LatLon, end: LatLon, steps = 60): [number, number][] {
  const lat1 = toRad(start.lat);
  const lon1 = toRad(start.lon);
  const lat2 = toRad(end.lat);
  const lon2 = toRad(end.lon);

  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );

  if (d === 0) return [[start.lat, start.lon]];

  return Array.from({ length: steps }, (_, i) => {
    const f = i / (steps - 1);
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
    const lon = (Math.atan2(y, x) * 180) / Math.PI;
    return [lat, lon] as [number, number];
  });
}
