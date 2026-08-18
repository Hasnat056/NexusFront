import type { ReactNode } from "react";
import styles from "./Panel.module.css";

interface PanelProps {
  title: string;
  hint?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, hint, headerExtra, children }: PanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h3>{title}</h3>
        {headerExtra ?? (hint !== undefined && <span className={styles.hint}>{hint}</span>)}
      </div>
      {children}
    </div>
  );
}
