"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./CaptainsLog.module.css";

interface CaptainsLogProps {
  triggerPayload: {
    shipName: string;
    tonnage: number;
    enginePower: number;
    driftKm: number;
    uo: number;
    vo: number;
    startLat: number;
    startLon: number;
    endLat: number;
    endLon: number;
  } | null;
}

function parseMarkdownBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className={styles.bold}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function CaptainsLog({ triggerPayload }: CaptainsLogProps) {
  const [logText, setLogText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!triggerPayload || triggerPayload.driftKm === 0) return;

    // Abort any in-progress stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLogText("");
    setHasError(false);
    setIsStreaming(true);

    (async () => {
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(triggerPayload),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setHasError(true);
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setLogText((prev) => prev + chunk);
          // Auto-scroll
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setHasError(true);
        }
      } finally {
        setIsStreaming(false);
      }
    })();

    return () => controller.abort();
  }, [triggerPayload]);

  const lines = logText.split("\n");

  return (
    <div className={styles.logContainer}>
      {/* Header */}
      <div className={styles.logHeader}>
        <div className={styles.logTitleRow}>
          <span className={`${styles.logIcon}`}>📜</span>
          <span className={`${styles.logTitle} font-display`}>CAPTAIN'S LOG</span>
          {isStreaming && (
            <div className={styles.streamIndicator}>
              <span className={styles.streamDot} />
              <span className={styles.streamDot} />
              <span className={styles.streamDot} />
            </div>
          )}
        </div>
        <div className={styles.logSubtitle}>
          AI Maritime Analysis · Gemini 1.5 Pro
        </div>
      </div>

      <div className="divider" />

      {/* Log body */}
      <div className={styles.logBody} ref={scrollRef}>
        {!triggerPayload || triggerPayload.driftKm === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>⚓</div>
            <p className={styles.emptyText}>
              Set a route and run the simulation to generate an AI analysis of
              the drift and ocean conditions.
            </p>
          </div>
        ) : hasError ? (
          <div className={styles.errorState}>
            ⚠️ AI analysis unavailable. Check your API key configuration.
          </div>
        ) : logText === "" && isStreaming ? (
          <div className={styles.loadingState}>
            <div className={styles.logSkeletonLine} style={{ width: "90%" }} />
            <div className={styles.logSkeletonLine} style={{ width: "75%" }} />
            <div className={styles.logSkeletonLine} style={{ width: "85%" }} />
            <div className={styles.logSkeletonLine} style={{ width: "60%" }} />
          </div>
        ) : (
          <div className={styles.logContent}>
            {lines.map((line, i) => {
              // Section headers: **DRIFT ANALYSIS** etc.
              if (line.startsWith("**") && line.endsWith("**")) {
                return (
                  <div key={i} className={styles.sectionHeader}>
                    {line.slice(2, -2)}
                  </div>
                );
              }
              if (line.trim() === "") {
                return <div key={i} className={styles.logSpacer} />;
              }
              return (
                <p key={i} className={styles.logLine}>
                  {parseMarkdownBold(line)}
                </p>
              );
            })}
            {isStreaming && <span className={styles.cursor}>█</span>}
          </div>
        )}
      </div>
    </div>
  );
}
