import type { ReactNode } from "react";
import { IconBars } from "../icons/Icons";
import styles from "./SidePanel.module.css";

interface SidePanelProps {
  title: string;
  count: number;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  reopenLabel: string;
  emptyMessage: string;
  children: ReactNode;
}

export function SidePanel({
  title,
  count,
  open,
  onClose,
  onOpen,
  reopenLabel,
  emptyMessage,
  children,
}: SidePanelProps) {
  if (!open) {
    return (
      <button type="button" className={styles.reopenTab} onClick={onOpen} aria-label={`Show ${title.toLowerCase()}`}>
        <IconBars />
        {reopenLabel}
        {count > 0 && <span className={styles.count}>{count}</span>}
      </button>
    );
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <h3>{title}</h3>
        <div className={styles.headExtra}>
          {count > 0 && <span className={styles.count}>{count}</span>}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>
            ×
          </button>
        </div>
      </div>
      {count === 0 ? <p className={styles.empty}>{emptyMessage}</p> : <div className={styles.list}>{children}</div>}
    </aside>
  );
}
