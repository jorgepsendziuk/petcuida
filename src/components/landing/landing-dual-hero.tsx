"use client";

import { useCallback, useEffect, useState } from "react";

import { PhotoScanHero } from "@/components/landing/photo-scan-hero";
import { PrescriptionReadHero } from "@/components/landing/prescription-read-hero";

import styles from "./landing-dual-hero.module.css";

const SCENES = [
  {
    id: "pet",
    caption: "Foto do pet → ficha pronta",
    tone: "pet" as const,
  },
  {
    id: "rx",
    caption: "Receita do vet → lembretes na mão",
    tone: "rx" as const,
  },
] as const;

const INTERVAL_MS = 5200;
const SWAP_MS = 720;

type SceneId = (typeof SCENES)[number]["id"];

function SceneVisual({ id, live }: { id: SceneId; live: boolean }) {
  if (id === "pet") {
    return <PhotoScanHero scanning={live} size="landing" />;
  }
  return <PrescriptionReadHero reading={live} size="landing" />;
}

export function LandingDualHero() {
  const [frontSlot, setFrontSlot] = useState(0);
  const [animating, setAnimating] = useState(false);

  const activeScene = SCENES[frontSlot];
  const backSlot = 1 - frontSlot;

  const beginSwap = useCallback(() => {
    setAnimating(true);
  }, []);

  const endSwap = useCallback(() => {
    setAnimating(false);
  }, []);

  useEffect(() => {
    const tick = window.setInterval(beginSwap, INTERVAL_MS);
    return () => window.clearInterval(tick);
  }, [beginSwap]);

  useEffect(() => {
    if (!animating) return;

    const frame = window.requestAnimationFrame(() => {
      setFrontSlot((slot) => 1 - slot);
    });

    const timer = window.setTimeout(endSwap, SWAP_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [animating, endSwap]);

  return (
    <div className={styles.wrap}>
      <div className={`${styles.deck} ${animating ? styles.deckAnimating : ""}`}>
        {SCENES.map((scene, slot) => {
          const isFront = slot === frontSlot;

          return (
            <div
              key={scene.id}
              className={`${styles.card} ${isFront ? styles.cardFront : styles.cardBack} ${scene.tone === "rx" ? styles.toneRx : styles.tonePet}`}
            >
              <div className={styles.cardFrame}>
                <SceneVisual id={scene.id} live={isFront} />
              </div>
              {!isFront && !animating ? <span className={styles.peekLabel}>{scene.caption}</span> : null}
            </div>
          );
        })}
      </div>

      <p
        className={`${styles.caption} ${styles[`caption${activeScene.tone}`]} ${animating ? styles.captionFade : ""}`}
      >
        {activeScene.caption}
      </p>

      <div className={styles.dots} aria-hidden>
        {SCENES.map((s, i) => (
          <span
            key={s.id}
            className={`${styles.dot} ${i === frontSlot ? styles.dotActive : ""} ${animating && i === backSlot ? styles.dotNext : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
