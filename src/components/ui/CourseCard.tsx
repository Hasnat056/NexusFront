import { Link } from "react-router-dom";
import type { CourseCardData } from "../../types/dashboard";
import { Tag } from "./Tag";
import styles from "./CourseCard.module.css";

export function CourseCard({ kicker, title, status, meta, href }: CourseCardData) {
  return (
    <Link to={href} className={styles.card}>
      <div className={styles.head}>
        <div>
          <div className={styles.kicker}>{kicker}</div>
          <div className={styles.title}>{title}</div>
        </div>
        <Tag tone={status.tone}>{status.label}</Tag>
      </div>
      {meta.length > 0 && (
        <div className={styles.meta}>
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
    </Link>
  );
}
