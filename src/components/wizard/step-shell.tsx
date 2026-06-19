import type { ReactNode } from "react";

import styles from "./step-shell.module.css";

type StepShellProps = {
  step: number;
  totalSteps: number;
  emoji: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function StepShell({ step, totalSteps, emoji, title, subtitle, children, actions }: StepShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.progress} aria-label={`Passo ${step + 1} de ${totalSteps}`}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i === step ? styles.dotActive : ""} ${i < step ? styles.dotDone : ""}`}
          />
        ))}
      </div>

      <header className={styles.header}>
        <div className={styles.emoji}>{emoji}</div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </header>

      <div className={styles.body}>{children}</div>

      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

export { styles as stepStyles };
