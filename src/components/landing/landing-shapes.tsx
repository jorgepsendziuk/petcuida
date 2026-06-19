"use client";

import styles from "./landing-shapes.module.css";

export function LandingShapes() {
  return (
    <div className={styles.canvas} aria-hidden>
      <div className={`${styles.shape} ${styles.ring}`} />
      <div className={`${styles.shape} ${styles.disc}`} />
      <div className={`${styles.shape} ${styles.triangle}`} />
      <div className={`${styles.shape} ${styles.pill}`} />
      <div className={`${styles.shape} ${styles.square}`} />
      <div className={`${styles.shape} ${styles.arc}`} />
      <div className={`${styles.shape} ${styles.dot1}`} />
      <div className={`${styles.shape} ${styles.dot2}`} />
      <div className={`${styles.shape} ${styles.dot3}`} />
      <div className={`${styles.shape} ${styles.zig}`} />
    </div>
  );
}
