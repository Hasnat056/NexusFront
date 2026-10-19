import type { DueItem } from "../../data/studentEnrollments";
import { SidePanel } from "./SidePanel";
import styles from "./WhatsDuePanel.module.css";

interface WhatsDuePanelProps {
  items: DueItem[];
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function WhatsDuePanel({ items, open, onClose, onOpen }: WhatsDuePanelProps) {
  return (
    <SidePanel
      title="What's due"
      count={items.length}
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      reopenLabel="Due"
      emptyMessage="Nothing due. No assessments have an open deadline right now."
    >
      {items.map((item) => (
        <div className={styles.row} key={item.id}>
          <div className={styles.date}>
            <span className={styles.day}>{item.date.getDate()}</span>
            <span className={styles.month}>{item.date.toLocaleString("en-US", { month: "short" })}</span>
          </div>
          <div className={styles.info}>
            <span className={styles.name}>{item.name}</span>
            <span className={styles.course}>{item.courseLabel}</span>
          </div>
        </div>
      ))}
    </SidePanel>
  );
}
