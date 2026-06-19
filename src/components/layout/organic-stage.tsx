import type { ReactNode } from "react";

import styles from "./organic-stage.module.css";

type ImportanceTier = 1 | 2 | 3 | 4;

type OrganicStageProps = {
  children: ReactNode;
  className?: string;
};

type OrganicItemProps = {
  children: ReactNode;
  tier?: ImportanceTier;
  scatter?: number;
  className?: string;
};

const tierClass: Record<ImportanceTier, string> = {
  1: styles.tier1,
  2: styles.tier2,
  3: styles.tier3,
  4: styles.tier4,
};

const scatterClasses = [
  styles.scatter0,
  styles.scatter1,
  styles.scatter2,
  styles.scatter3,
  styles.scatter4,
  styles.scatter5,
];

export function OrganicStage({ children, className }: OrganicStageProps) {
  return <div className={`${styles.stage} ${className ?? ""}`}>{children}</div>;
}

export function OrganicItem({ children, tier, scatter, className }: OrganicItemProps) {
  const tierCls = tier ? tierClass[tier] : "";
  const scatterCls = scatter !== undefined ? scatterClasses[scatter % scatterClasses.length] : "";

  return (
    <div className={`${styles.item} ${tierCls} ${scatterCls} ${className ?? ""}`.trim()}>
      {children}
    </div>
  );
}

export function OrganicLabel({ children }: { children: ReactNode }) {
  return <p className={styles.label}>{children}</p>;
}
