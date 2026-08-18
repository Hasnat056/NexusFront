import type { StatStripItem } from "../../types/dashboard";
import { StatStrip } from "./StatStrip";
import styles from "./ProfileStrip.module.css";

interface ProfileStripProps {
  avatarInitials: string;
  name: string;
  meta: string[];
  stats: StatStripItem[];
}

export function ProfileStrip({ avatarInitials, name, meta, stats }: ProfileStripProps) {
  return (
    <div className={styles.strip}>
      <div className={styles.avatar}>{avatarInitials}</div>
      <div className={styles.meta}>
        <div className={styles.name}>{name}</div>
        <div className={styles.sub}>
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
      <StatStrip items={stats} />
    </div>
  );
}
