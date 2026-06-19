"use client";

import styles from "./photo-scan-hero.module.css";

export type ScanBadge = {
  label: string;
  value: string;
  tone?: "purple" | "pink" | "teal";
};

type PhotoScanHeroProps = {
  photoUrl?: string | null;
  emoji?: string;
  scanning?: boolean;
  badges?: ScanBadge[];
  /** @deprecated use size="compact" */
  compact?: boolean;
  size?: "default" | "compact" | "landing";
};

const DEMO_BADGES: ScanBadge[] = [
  { label: "Raça", value: "SRD", tone: "purple" },
  { label: "Idade", value: "~3 anos", tone: "pink" },
  { label: "Cor", value: "Caramelo", tone: "teal" },
];

export function PhotoScanHero({
  photoUrl,
  emoji = "🐕",
  scanning = true,
  badges = DEMO_BADGES,
  compact = false,
  size,
}: PhotoScanHeroProps) {
  const resolvedSize = size ?? (compact ? "compact" : "default");
  const sizeClass =
    resolvedSize === "landing" ? styles.landing : resolvedSize === "compact" ? styles.compact : "";

  return (
    <div
      className={`${styles.stage} ${sizeClass}`}
      aria-hidden={!photoUrl && resolvedSize !== "compact" && resolvedSize !== "landing"}
    >
      <div className={styles.glow} />

      <div className={styles.photoCard}>
        <div className={styles.photoInner}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className={styles.petPhoto} />
          ) : (
            <span className={styles.petEmoji}>{emoji}</span>
          )}
          {scanning && (
            <>
              <div className={styles.scanLine} />
              <div className={styles.scanShine} />
            </>
          )}
        </div>
        <div className={styles.cornerPaw}>🐾</div>
      </div>

      {badges.map((badge, i) => (
        <div
          key={`${badge.label}-${i}`}
          className={`${styles.badge} ${styles[`badgePos${i + 1}`]} ${styles[`tone${badge.tone ?? "purple"}`]}`}
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          <span className={styles.badgeLabel}>{badge.label}</span>
          <span className={styles.badgeValue}>{badge.value}</span>
        </div>
      ))}

      <div className={styles.sparkle1}>✦</div>
      <div className={styles.sparkle2}>✦</div>
      <div className={styles.sparkle3}>★</div>
    </div>
  );
}
