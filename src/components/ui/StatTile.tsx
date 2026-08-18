import type { StatMetric } from "../../types/dashboard";
import { StatusBreakdownBar } from "./StatusBreakdownBar";
import styles from "./StatTile.module.css";

export function StatTile({ label, value, breakdown }: StatMetric) {
  return (
    <div className={styles.tile}>
      <p className={styles.label}>{label}</p>
      <div className={styles.value}>{value}</div>
      {breakdown && breakdown.length > 0 && <StatusBreakdownBar segments={breakdown} />}
    </div>
  );
}
