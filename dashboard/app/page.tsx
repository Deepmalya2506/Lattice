"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "./page.module.css";
import MacbookDataView from "@/components/MacbookDataView";

const TRUST_DATA = [
  {
    title: "Global AIS Integration",
    text: "Real-time vessel telematics ingested at 1Hz frequency via dedicated satellite links. We track over 300,000 active vessels globally, integrating position, heading, speed over ground, and navigational status into a continuously updated state engine.",
    id: "LAYER-01",
    color: "#38bdf8"
  },
  {
    title: "Physics-Informed LSTM",
    text: "Our core AI embeds Navier-Stokes fluid dynamics and wind resistance coefficients directly into the neural network architecture, achieving a 40% reduction in prediction error compared to standard machine learning models.",
    id: "LAYER-02",
    color: "#10b981"
  },
  {
    title: "Geopolitical Risk Graph",
    text: "Live ingestion of GDELT event streams maps global tension, naval exercises, and piracy hotspots onto a dynamic spatial knowledge graph. The system autonomously routes around emergent risk zones before human analysts receive the alert.",
    id: "LAYER-03",
    color: "#a855f7"
  },
  {
    title: "Oceanic Resistance Mapping",
    text: "High-resolution bathymetry and oceanic current data are combined to create a continuous friction surface. This allows our heuristic nudge model to identify hyper-efficient flow channels, reducing fuel consumption by up to 15%.",
    id: "LAYER-04",
    color: "#fbbf24"
  },
];

const FAQ_DATA = [
  {
    q: "What is the role of the Physics-Informed Neural Network (PINN)?",
    a: "Unlike standard AI, our PINN incorporates the laws of fluid dynamics (Navier-Stokes) directly into the neural architecture, ensuring drift predictions respect the physical constraints of ocean currents.",
  },
  {
    q: "How does the SHAP analysis help in decision making?",
    a: "SHAP (SHapley Additive exPlanations) provides absolute transparency. It breaks down exactly how much each factor—like geopolitical tension or wave height—contributed to the final route recommendation.",
  },
  {
    q: "Can Lattice integrate with real-time AIS hardware?",
    a: "Yes. Lattice is designed to ingest high-frequency telemetry from bridge-mounted AIS transponders, allowing for sub-minute corrective nudges in restricted corridors.",
  },
  {
    q: "Is the system capable of real-time adaptation?",
    a: "Yes. The state engine processes incoming AIS data at a 1Hz frequency. If a vessel deviates from its optimized path or if a sudden storm materializes, the system instantly recalculates the optimal trajectory and updates the Captain's Console."
  },
  {
    q: "How does Lattice handle sparse data regions?",
    a: "In areas with low AIS coverage, the PI-LSTM leverages its embedded physics constraints to hallucinate physically viable trajectories, maintaining high accuracy even during communication blackouts."
  },
  {
    q: "What hardware is required onboard the vessel?",
    a: "Lattice is a cloud-native SaaS platform. No proprietary hardware is required onboard. We interface directly with the vessel's existing AIS transponder data and telemetry systems via secure API gateways."
  },
  {
    q: "Can the system integrate with proprietary fleet data?",
    a: "Absolutely. Our ingestion layer is designed to securely accept proprietary engine telemetry, cargo manifests, and historical voyage logs, fine-tuning the physics model specifically to your fleet's unique characteristics."
  },
  {
    q: "How do you ensure the security of the Knowledge Graph?",
    a: "Our Neo4j instance is isolated within a private VPC, utilizing role-based access control (RBAC) and end-to-end encryption. Geopolitical intelligence feeds are sanitized and verified through a multi-stage anomaly detection pipeline."
  }
];

function FAQAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className={styles.faqContainer}>
      {FAQ_DATA.map((faq, idx) => (
        <div key={idx} className={styles.faqItem} onClick={() => setOpenIdx(openIdx === idx ? null : idx)}>
          <div className={styles.faqQuestion}>
            {faq.q}
            {openIdx === idx ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
          </div>
          <AnimatePresence>
            {openIdx === idx && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={styles.faqAnswer}
              >
                {faq.a}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [currentCard, setCurrentCard] = useState(0);

  const nextCard = () => {
    setCurrentCard((prev) => (prev + 1) % TRUST_DATA.length);
  };

  const prevCard = () => {
    setCurrentCard((prev) => (prev - 1 + TRUST_DATA.length) % TRUST_DATA.length);
  };

  return (
    <main style={{ background: "#0a192f" }}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <video 
          autoPlay={true}
          loop={true}
          muted={false}
          playsInline={true}
          className={styles.videoBg}
          preload="auto"
        >
          <source src="/ocean.mp4" type="video/mp4" />
        </video>
        <div className={styles.vignette} />
        
        <div className={styles.heroContent}>
          <motion.h1 
            className={styles.headline}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            The Physics of the Sea, <span className={styles.accentText}>Decoded.</span>
          </motion.h1>
          
          <motion.p 
            className={styles.subheadline}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            Real-time maritime drift prediction and path optimization powered by Physics-Informed Neural Networks.
          </motion.p>
        </div>
      </section>

      {/* Intelligence Layers Section - Carousel */}
      <section id="trust" className={styles.section}>
        <motion.h2 
          className={styles.sectionTitle}
          initial={{ opacity: 0, letterSpacing: "10px" }}
          whileInView={{ opacity: 1, letterSpacing: "2px" }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          Intelligence Layers
        </motion.h2>
        
        <div className={styles.carouselContainer}>
          <button className={styles.carouselBtn} onClick={prevCard}>◀</button>
          
          <div className={styles.carouselTrack}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard}
                className={styles.gamifiedCard}
                style={{ width: "100%", maxWidth: 600, margin: "0 auto" }}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.4 }}
              >
                <div className={styles.cardId} style={{ color: TRUST_DATA[currentCard].color }}>
                  {TRUST_DATA[currentCard].id}
                </div>
                <h3 className={styles.cardTitle}>{TRUST_DATA[currentCard].title}</h3>
                <p className={styles.cardText}>{TRUST_DATA[currentCard].text}</p>
                <div className={styles.cardGlow} style={{ background: TRUST_DATA[currentCard].color }} />
              </motion.div>
            </AnimatePresence>
          </div>

          <button className={styles.carouselBtn} onClick={nextCard}>▶</button>
        </div>

        {/* CTA Launch Command after the carousel */}
        <motion.div
          className={styles.ctaContainer}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Link href="/dashboard" className={styles.cta}>
            Enter Command Center
          </Link>
        </motion.div>

        {/* Macbook Graph Data View */}
        <MacbookDataView />
      </section>

      {/* FAQ Section */}
      <section id="faq" className={styles.section} style={{ paddingTop: 60, paddingBottom: 160 }}>
        <motion.h2 
          className={styles.sectionTitle}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Knowledge Base
        </motion.h2>
        
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          style={{ width: "100%", display: "flex", justifyContent: "center" }}
        >
          <FAQAccordion />
        </motion.div>
      </section>
    </main>
  );
}
