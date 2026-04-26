"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Shipment, SimulationResponse, OptimizeResponse } from "./types";

interface ShipStateContextType {
  mmsi: string | null;
  setMmsi: (mmsi: string | null) => void;
  shipment: Shipment | null;
  setShipment: (ship: Shipment | null) => void;
  simData: SimulationResponse | null;
  setSimData: (data: SimulationResponse | null) => void;
  optimData: OptimizeResponse | null;
  setOptimData: (data: OptimizeResponse | null) => void;
}

const ShipStateContext = createContext<ShipStateContextType | undefined>(undefined);

export function ShipStateProvider({ children }: { children: ReactNode }) {
  const [mmsi, setMmsi] = useState<string | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [simData, setSimData] = useState<SimulationResponse | null>(null);
  const [optimData, setOptimData] = useState<OptimizeResponse | null>(null);

  return (
    <ShipStateContext.Provider value={{ mmsi, setMmsi, shipment, setShipment, simData, setSimData, optimData, setOptimData }}>
      {children}
    </ShipStateContext.Provider>
  );
}

export function useShipState() {
  const context = useContext(ShipStateContext);
  if (context === undefined) {
    throw new Error("useShipState must be used within a ShipStateProvider");
  }
  return context;
}
