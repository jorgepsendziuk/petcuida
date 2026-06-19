import type { ReactNode } from "react";

import styles from "./pastel-wizard-shell.module.css";

type PastelWizardShellProps = {
  step: number;
  totalSteps: number;
  emoji?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function PastelWizardShell({
  step,
  totalSteps,
  emoji,
  title,
  subtitle,
  children,
  actions,
}: PastelWizardShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.progress} aria-label={`Passo ${step + 1} de ${totalSteps}`}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`${styles.dot} ${index === step ? styles.dotActive : ""} ${index < step ? styles.dotDone : ""}`}
          />
        ))}
      </div>

      <header className={styles.header}>
        {emoji ? <div className={styles.emoji}>{emoji}</div> : null}
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </header>

      <div className={styles.body}>{children}</div>

      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

export { styles as pastelWizardStyles };
