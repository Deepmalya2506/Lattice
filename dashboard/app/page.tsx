"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "./page.module.css";

const TRUST_DATA = [
  {
    title: "Copernicus Marine",
    text: "Real-time oceanic physics and 4D visualizations driving our core predictive models.",
    id: "01",
    color: "#38bdf8"
  },
  {
    title: "GDELT Project",
    text: "Global maritime event monitoring and geopolitical risk assessment.",
    id: "02",
    color: "#a855f7"
  },
  {
    title: "GFW AIS Data",
    text: "Global Fishing Watch satellite-based vessel tracking and historical intelligence.",
    id: "03",
    color: "#10b981"
  },
  {
    title: "NOAA & NASA",
    text: "Atmospheric forcing, wind datasets, and advanced satellite imagery.",
    id: "04",
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
          muted={true}
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
