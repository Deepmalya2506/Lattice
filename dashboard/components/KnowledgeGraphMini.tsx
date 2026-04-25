"use client";

import { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { Shipment } from "@/lib/types";

interface KGProps {
  shipment: Shipment | null;
}

export default function KnowledgeGraphMini({ shipment }: KGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 250, height: 200 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  }, []);

  // Build graph data
  const graphData = {
    nodes: [] as any[],
    links: [] as any[],
  };

  if (shipment) {
    graphData.nodes.push({ id: "ship", group: 1, name: shipment.name, val: 5 });
    graphData.nodes.push({ id: "org", group: 2, name: shipment.origin.name, val: 3 });
    graphData.nodes.push({ id: "dst", group: 2, name: shipment.destination.name, val: 3 });
    
    graphData.links.push({ source: "ship", target: "org", name: "DEPARTED_FROM" });
    graphData.links.push({ source: "ship", target: "dst", name: "BOUND_FOR" });

    // Add some neighboring "particle" nodes to show interconnectedness
    for (let i = 0; i < 15; i++) {
      const id = `extra_${i}`;
      graphData.nodes.push({ id, group: 0, name: `Entity ${i}`, val: 1 });
      graphData.links.push({ source: i % 2 === 0 ? "org" : "dst", target: id });
    }

    if (shipment.geopolitics) {
      graphData.nodes.push({ id: "risk", group: 3, name: shipment.geopolitics.region, val: 4 });
      graphData.links.push({ source: "ship", target: "risk", name: "AT_RISK_IN" });
    }
  } else {
    // Map of trade generic graph - A dense cloud of particles
    for (let i = 0; i < 60; i++) {
      graphData.nodes.push({ 
        id: `n${i}`, 
        group: i % 4 === 0 ? 2 : 0, 
        name: i % 4 === 0 ? "Major Hub" : "Trade Entity", 
        val: i % 4 === 0 ? 3 : 1 
      });
      if (i > 0) {
        graphData.links.push({ source: `n${i}`, target: `n${Math.floor(Math.random() * i)}` });
      }
    }
  }

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: "100%", 
        height: "100%", 
        background: "rgba(2, 4, 8, 0.4)", 
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative"
      }}
    >
      <div style={{ position: "absolute", top: 8, left: 8, fontSize: 9, color: "var(--text-muted)", zIndex: 10, letterSpacing: "0.1em" }}>
        KG PARTICLE NETWORK
      </div>
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeColor={(node: any) => {
          if (node.group === 1) return "#00ff88"; // Ship - Green
          if (node.group === 2) return "#00d4ff"; // Port - Blue
          if (node.group === 3) return "#ff3355"; // Risk - Red
          return "rgba(255,255,255,0.3)";
        }}
        nodeLabel="name"
        backgroundColor="transparent"
        linkColor={() => "rgba(255,255,255,0.05)"}
        d3VelocityDecay={0.1}
        nodeRelSize={1}
      />
    </div>
  );
}
