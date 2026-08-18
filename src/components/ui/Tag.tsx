import type { StatusTone } from "../../types/dashboard";
import styles from "./Tag.module.css";

interface TagProps {
  tone: StatusTone;
  children: string;
}

export function Tag({ tone, children }: TagProps) {
  return (
    <span className={styles.tag} data-tone={tone}>
      {children}
    </span>
  );
}
