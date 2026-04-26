"use client";

import { useEffect, useRef } from "react";
import styles from "./MacbookDataView.module.css";
import { motion } from "framer-motion";

const SAMPLE_DATA = [
  { mmsi: "139506144", name: "HYUNDAI ALGECIRAS 32", type: "Bulk Carrier", status: "In Transit", origin: "Rotterdam", dest: "Santos" },
  { mmsi: "140740711", name: "MV LATTICE 33", type: "Bulk Carrier", status: "In Transit", origin: "Cape Town", dest: "Santos" },
  { mmsi: "141975278", name: "HAPAG LLOYD BERLIN 34", type: "Bulk Carrier", status: "In Transit", origin: "Jebel Ali", dest: "Singapore" },
  { mmsi: "143209845", name: "HAPAG LLOYD BERLIN 35", type: "Bulk Carrier", status: "In Transit", origin: "Long Beach", dest: "Shanghai" },
  { mmsi: "144444412", name: "PACIFIC TRADER 36", type: "Container Ship", status: "In Transit", origin: "New York", dest: "Rotterdam" },
  { mmsi: "145678979", name: "EVER GLOBE 37", type: "Container Ship", status: "In Transit", origin: "Singapore", dest: "Jebel Ali" },
  { mmsi: "146913546", name: "MV LATTICE 38", type: "Container Ship", status: "In Transit", origin: "Santos", dest: "Rotterdam" },
  { mmsi: "148148113", name: "CMA CGM ANTOINE 39", type: "Oil Tanker", status: "In Transit", origin: "Long Beach", dest: "Tokyo" },
  { mmsi: "153086381", name: "COSCO SHIPPING 43", type: "Bulk Carrier", status: "In Transit", origin: "Rotterdam", dest: "Santos" },
];

export default function MacbookDataView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: { x: number; y: number; vx: number; vy: number; radius: number }[] = [];
    const numParticles = 40;

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
      });
    }

    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(56, 189, 248, 0.8)";
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${1 - dist / 100})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <motion.div 
      className={styles.macbookFrame}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1, type: "spring" }}
    >
      <div className={styles.macbookScreen}>
        <div className={styles.macbookHeader}>
          <div className={styles.macbookControls}>
            <span className={styles.dot} style={{ background: "#ef4444" }}></span>
            <span className={styles.dot} style={{ background: "#eab308" }}></span>
            <span className={styles.dot} style={{ background: "#22c55e" }}></span>
          </div>
          <div className={styles.macbookTitle}>Lattice Knowledge Graph Database</div>
        </div>

        <div className={styles.macbookContent}>
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>MMSI</th>
                  <th>Vessel Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Origin</th>
                  <th>Destination</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_DATA.map((row, idx) => (
                  <tr key={idx}>
                    <td className={styles.mmsiCol}>{row.mmsi}</td>
                    <td>{row.name}</td>
                    <td>{row.type}</td>
                    <td><span className={styles.statusBadge}>{row.status}</span></td>
                    <td>{row.origin}</td>
                    <td>{row.dest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.graphOverlay}>
            <div className={styles.gradientMask} />
            <canvas ref={canvasRef} className={styles.particleCanvas} />
          </div>
        </div>
      </div>
      <div className={styles.macbookBase} />
    </motion.div>
  );
}
