"""
Lattice A* Path Optimizer Service
FastAPI microservice — all heavy route optimization stays Python-side.

Cost Function: dist + α * (ship_vel · current_vel)
A negative dot product (current opposing ship) increases cost.
A positive dot product (current aiding ship) decreases cost → fuel savings.
"""

import math
import heapq
from typing import List, Tuple, Optional

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Lattice Optimizer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Data Models ─────────────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    tonnage: float = 5000.0
    engine_power: float = 2000.0
    alpha: float = 0.4       # Fuel-weighting factor in cost function


class OptimizeResponse(BaseModel):
    optimized_path: List[List[float]]   # [[lat, lon], ...]
    fuel_saving_pct: float
    waypoints: int
    baseline_cost: float
    optimized_cost: float


# ─── Physics Helpers ─────────────────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def mock_ocean_current(lat: float, lon: float) -> Tuple[float, float]:
    """
    Mock Copernicus-style current field.
    Returns (uo, vo) in m/s.
    In production: fetch from Copernicus WMTS/API at this point.
    """
    # Simulate Gulf Stream influence in North Atlantic
    # Gulf Stream: strong NE current between lat 25-45, lon -80 to -30
    uo, vo = 0.1, 0.05  # baseline
    if 25 <= lat <= 45 and -80 <= lon <= -30:
        uo = 0.8 + 0.4 * math.sin(math.radians(lat * 3))   # Eastward
        vo = 0.3 + 0.2 * math.cos(math.radians(lon * 2))   # Northward
    elif lat > 45:
        uo = -0.2   # Opposing westerlies effect
        vo = 0.15
    return uo, vo


def ship_velocity_vector(from_lat: float, from_lon: float, to_lat: float, to_lon: float) -> Tuple[float, float]:
    """Normalized ship movement direction (unit vector in lat/lon space)."""
    dlat = to_lat - from_lat
    dlon = to_lon - from_lon
    mag = math.sqrt(dlat**2 + dlon**2) + 1e-9
    return dlat / mag, dlon / mag


def edge_cost(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
    alpha: float,
    tonnage: float,
    engine_power: float
) -> float:
    """
    A* edge cost: dist_km + α * (ship_dir · current_opposition)
    Heavier ships are penalized more by opposing currents (tonnage effect).
    """
    dist = haversine_km(lat1, lon1, lat2, lon2)
    uo, vo = mock_ocean_current((lat1 + lat2) / 2, (lon1 + lon2) / 2)

    sv_lat, sv_lon = ship_velocity_vector(lat1, lon1, lat2, lon2)

    # Normalize current to lat/lon direction units for dot product
    current_mag = math.sqrt(uo**2 + vo**2) + 1e-9
    cu_norm = uo / current_mag
    cv_norm = vo / current_mag

    # Dot product: positive = current aids ship (cost ↓), negative = opposing (cost ↑)
    dot = sv_lat * cv_norm + sv_lon * cu_norm

    # Tonnage effect: heavier ship needs more power to overcome opposing currents
    tonnage_factor = 1.0 + (tonnage / 10000.0) * 0.3
    power_factor = engine_power / 2000.0  # More power reduces current penalty

    current_penalty = alpha * (-dot) * tonnage_factor / power_factor

    return dist + current_penalty


# ─── Grid Generation ─────────────────────────────────────────────────────────

def build_spherical_grid(
    start_lat: float, start_lon: float,
    end_lat: float, end_lon: float,
    resolution: int = 8
) -> List[Tuple[float, float]]:
    """
    Build a grid of waypoints in the bounding box between start and end.
    resolution = number of divisions per axis.
    """
    lat_min = min(start_lat, end_lat) - 3
    lat_max = max(start_lat, end_lat) + 3
    lon_min = min(start_lon, end_lon) - 3
    lon_max = max(start_lon, end_lon) + 3

    nodes = []
    for i in range(resolution + 1):
        for j in range(resolution + 1):
            lat = lat_min + (lat_max - lat_min) * i / resolution
            lon = lon_min + (lon_max - lon_min) * j / resolution
            nodes.append((lat, lon))

    # Always include start and end
    nodes.append((start_lat, start_lon))
    nodes.append((end_lat, end_lon))
    return nodes


# ─── A* Algorithm ────────────────────────────────────────────────────────────

def astar(
    nodes: List[Tuple[float, float]],
    start: Tuple[float, float],
    goal: Tuple[float, float],
    alpha: float,
    tonnage: float,
    engine_power: float,
    k_neighbors: int = 6
) -> Tuple[List[Tuple[float, float]], float]:
    """
    A* on a spherical grid.
    Each node connects to its k nearest neighbors.
    Returns (path, total_cost).
    """
    node_idx = {n: i for i, n in enumerate(nodes)}
    start_idx = len(nodes) - 2
    goal_idx = len(nodes) - 1

    # Pre-compute k-nearest neighbors for each node
    def get_neighbors(idx: int) -> List[int]:
        src = nodes[idx]
        dists = [
            (haversine_km(src[0], src[1], nodes[j][0], nodes[j][1]), j)
            for j in range(len(nodes)) if j != idx
        ]
        dists.sort()
        return [j for _, j in dists[:k_neighbors]]

    # Heuristic: straight-line haversine distance to goal
    def h(idx: int) -> float:
        n = nodes[idx]
        g = nodes[goal_idx]
        return haversine_km(n[0], n[1], g[0], g[1])

    open_set: List[Tuple[float, int]] = [(0.0, start_idx)]
    g_score = {start_idx: 0.0}
    came_from: dict[int, int] = {}

    while open_set:
        _, current = heapq.heappop(open_set)

        if current == goal_idx:
            # Reconstruct path
            path = []
            node = current
            while node in came_from:
                path.append(nodes[node])
                node = came_from[node]
            path.append(nodes[start_idx])
            return list(reversed(path)), g_score[goal_idx]

        for neighbor in get_neighbors(current):
            nc = nodes[current]
            nn = nodes[neighbor]
            tentative_g = g_score.get(current, float("inf")) + edge_cost(
                nc[0], nc[1], nn[0], nn[1], alpha, tonnage, engine_power
            )
            if tentative_g < g_score.get(neighbor, float("inf")):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f = tentative_g + h(neighbor)
                heapq.heappush(open_set, (f, neighbor))

    # Fallback: straight line if A* fails
    return [nodes[start_idx], nodes[goal_idx]], float("inf")


# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Lattice Optimizer Online", "version": "1.0.0"}


@app.post("/optimize_route", response_model=OptimizeResponse)
def optimize_route(req: OptimizeRequest):
    start = (req.start_lat, req.start_lon)
    goal = (req.end_lat, req.end_lon)

    nodes = build_spherical_grid(
        req.start_lat, req.start_lon,
        req.end_lat, req.end_lon,
        resolution=10
    )

    optimized_path, opt_cost = astar(
        nodes, start, goal,
        req.alpha, req.tonnage, req.engine_power,
        k_neighbors=8
    )

    # Baseline: straight great-circle cost
    baseline_cost = haversine_km(req.start_lat, req.start_lon, req.end_lat, req.end_lon)
    
    fuel_saving_pct = max(0.0, (baseline_cost - opt_cost) / baseline_cost * 100) if baseline_cost > 0 else 0.0

    return OptimizeResponse(
        optimized_path=[[p[0], p[1]] for p in optimized_path],
        fuel_saving_pct=round(fuel_saving_pct, 2),
        waypoints=len(optimized_path),
        baseline_cost=round(baseline_cost, 2),
        optimized_cost=round(opt_cost, 2)
    )
