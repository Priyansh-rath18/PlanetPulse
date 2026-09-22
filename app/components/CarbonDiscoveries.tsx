"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bus,
  Car,
  Cloud,
  ExternalLink,
  Factory,
  Footprints,
  Globe,
  Package,
  Plane,
  Recycle,
  Sparkles,
  Sprout,
  Sun,
  Trash2,
  Trees,
  Utensils,
  Waves,
  Zap,
} from "lucide-react";
import { CARBON_FACTS, type CarbonFact } from "../lib/factsData";
import {
  advanceRotation,
  createRotation,
  currentFactId,
  type RotationState,
} from "../lib/factRotation";
import { useReducedMotion } from "../lib/useReducedMotion";

/* Configurable rotation timing - change this to retime the widget. */
export const FACT_ROTATION_INTERVAL = 8000;

const TRANSITION_MS = 300;

const ICON_MAP: Record<string, typeof Car> = {
  car: Car,
  plane: Plane,
  bus: Bus,
  zap: Zap,
  sun: Sun,
  utensils: Utensils,
  trash: Trash2,
  sprout: Sprout,
  trees: Trees,
  waves: Waves,
  recycle: Recycle,
  factory: Factory,
  package: Package,
  cloud: Cloud,
  footprints: Footprints,
  globe: Globe,
};

const FACTS_BY_ID: Record<string, CarbonFact> = Object.fromEntries(
  CARBON_FACTS.map((fact) => [fact.id, fact])
);

const ALL_FACT_IDS = CARBON_FACTS.map((fact) => fact.id);

const DOT_COUNT = Math.min(CARBON_FACTS.length, 5);

export default function CarbonDiscoveries() {
  const reducedMotion = useReducedMotion();

  /*
   * Shuffling picks a random starting fact, which would differ
   * between the server-rendered HTML and the client's hydration
   * pass and trigger a hydration mismatch. So the first paint is
   * always the deterministic first fact, and the real (randomized)
   * rotation only starts once mounted on the client.
   */
  const rotationRef = useRef<RotationState | null>(null);

  const [factId, setFactId] = useState<string>(ALL_FACT_IDS[0]);

  const [cursor, setCursor] = useState(0);

  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    rotationRef.current = createRotation(ALL_FACT_IDS);
    setFactId(currentFactId(rotationRef.current));
    setCursor(rotationRef.current.cursor);

    const tick = () => {
      const advance = () => {
        rotationRef.current = advanceRotation(
          rotationRef.current!,
          ALL_FACT_IDS
        );
        setFactId(currentFactId(rotationRef.current));
        setCursor(rotationRef.current.cursor);
      };

      if (reducedMotion) {
        advance();
        return;
      }

      setHidden(true);

      window.setTimeout(() => {
        advance();
        setHidden(false);
      }, TRANSITION_MS);
    };

    const interval = window.setInterval(
      tick,
      FACT_ROTATION_INTERVAL
    );

    return () => window.clearInterval(interval);
  }, [reducedMotion]);

  const fact = FACTS_BY_ID[factId];
  const Icon = ICON_MAP[fact.icon] || Globe;

  return (
    <section className="panel discoveryPanel">
      <div className="panelHeader">
        <div>
          <span className="sectionLabel">
            <Sparkles size={11} style={{ verticalAlign: "-2px" }} />{" "}
            CARBON DISCOVERY
          </span>
        </div>
      </div>

      <div
        className={
          reducedMotion
            ? "discoveryBody"
            : hidden
            ? "discoveryBody discoveryHidden"
            : "discoveryBody"
        }
      >
        <h2 className="discoveryTitle">
          <Icon size={19} />
          {fact.title}
        </h2>

        <p className="discoveryFact">{fact.fact}</p>

        <div className="discoveryMeta">
          <span className="discoveryTag">
            {fact.category.toUpperCase()} • CLIMATE
          </span>

          <a
            className="discoverySource"
            href={fact.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <div className="discoveryDots">
        {Array.from({ length: DOT_COUNT }, (_, index) => (
          <span
            key={index}
            className={
              index === cursor % DOT_COUNT
                ? "discoveryDot discoveryDotActive"
                : "discoveryDot"
            }
          />
        ))}
      </div>
    </section>
  );
}
