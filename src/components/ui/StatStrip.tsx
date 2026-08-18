import type { StatStripItem } from "../../types/dashboard";
import styles from "./StatStrip.module.css";

export function StatStrip({ items }: { items: StatStripItem[] }) {
  return (
    <div className={styles.strip}>
      {items.map((item) => (
        <div className={styles.stat} key={item.label}>
          <b>{item.value}</b>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
