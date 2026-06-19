import { FLOATING_ANIMALS } from "@/lib/nav-theme";

import styles from "./animal-background.module.css";

const POSITIONS = [
  { top: "8%", left: "5%", delay: 0, size: 1 },
  { top: "22%", right: "8%", delay: -4, size: 1.2 },
  { top: "55%", left: "12%", delay: -8, size: 0.9 },
  { top: "70%", right: "15%", delay: -12, size: 1.1 },
  { top: "38%", left: "45%", delay: -16, size: 0.85 },
  { bottom: "25%", left: "35%", delay: -6, size: 1.15 },
];

export function AnimalBackground() {
  return (
    <div className={styles.layer} aria-hidden>
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />
      <div className={`${styles.blob} ${styles.blob3}`} />
      {POSITIONS.map((pos, i) => (
        <span
          key={i}
          className={styles.animal}
          style={{
            top: pos.top,
            left: pos.left,
            right: pos.right,
            bottom: pos.bottom,
            animationDelay: `${pos.delay}s`,
            fontSize: `${pos.size * 3}rem`,
          }}
        >
          {FLOATING_ANIMALS[i % FLOATING_ANIMALS.length]}
        </span>
      ))}
    </div>
  );
}
