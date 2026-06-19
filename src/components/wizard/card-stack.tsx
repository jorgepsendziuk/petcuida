"use client";

import type { ReactNode } from "react";
import { Children } from "react";

import styles from "./card-stack.module.css";

type CardStackProps = {
  step: number;
  children: ReactNode[];
};

export function CardStack({ step, children }: CardStackProps) {
  const cards = Children.toArray(children);

  return (
    <div className={styles.stack} aria-live="polite">
      {cards.map((child, i) => {
        if (i > step) return null;
        const depth = step - i;
        const isActive = i === step;

        return (
          <div
            key={i}
            className={`${styles.card} ${isActive ? styles.cardActive : styles.cardPast}`}
            style={{ "--depth": depth } as React.CSSProperties}
            aria-hidden={!isActive}
          >
            <div className={styles.cardInner}>{child}</div>
          </div>
        );
      })}
    </div>
  );
}
