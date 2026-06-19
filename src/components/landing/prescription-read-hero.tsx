"use client";

import styles from "./prescription-read-hero.module.css";

const BADGES = [
  { label: "Remédio", value: "Vermífugo", tone: "teal" as const },
  { label: "Horário", value: "Todo mês", tone: "purple" as const },
  { label: "Lembrete", value: "Ativado", tone: "pink" as const },
];

type PrescriptionReadHeroProps = {
  size?: "default" | "landing";
  reading?: boolean;
};

export function PrescriptionReadHero({ size = "default", reading = true }: PrescriptionReadHeroProps) {
  const sizeClass = size === "landing" ? styles.landing : "";

  return (
    <div className={`${styles.stage} ${sizeClass}`} aria-hidden>
      <div className={styles.glow} />

      <div className={styles.rxCard}>
        <div className={styles.rxHeader}>
          <span className={styles.rxIcon}>🩺</span>
          <span className={styles.rxClinic}>Receita veterinária</span>
        </div>
        <div className={styles.rxBody}>
          <div className={styles.rxLine} style={{ width: "88%" }} />
          <div className={styles.rxLine} style={{ width: "72%" }} />
          <div className={styles.rxLineStrong}>Vermífugo · 1 comp.</div>
          <div className={styles.rxLine} style={{ width: "64%" }} />
          <div className={styles.rxLineFaint} style={{ width: "52%" }} />
          {reading && (
            <>
              <div className={styles.readLine} />
              <div className={styles.readShine} />
            </>
          )}
        </div>
        <div className={styles.cornerPill}>💊</div>
      </div>

      {BADGES.map((badge, i) => (
        <div
          key={badge.label}
          className={`${styles.badge} ${styles[`badgePos${i + 1}`]} ${styles[`tone${badge.tone}`]}`}
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          <span className={styles.badgeLabel}>{badge.label}</span>
          <span className={styles.badgeValue}>{badge.value}</span>
        </div>
      ))}

      <div className={styles.sparkle1}>✦</div>
      <div className={styles.sparkle2}>★</div>
    </div>
  );
}
