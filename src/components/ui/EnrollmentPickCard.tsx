import type { EnrollmentCreateAllocation } from "../../types/api";
import styles from "./EnrollmentPickCard.module.css";

interface EnrollmentPickCardProps {
  allocation: EnrollmentCreateAllocation;
  confirmed: boolean;
  onToggle: (allocationId: number) => void;
}

export function EnrollmentPickCard({ allocation, confirmed, onToggle }: EnrollmentPickCardProps) {
  const { allocation_id, faculty_data, course_data } = allocation;

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <div className={styles.head}>
          <span className={styles.code}>{course_data.course_code}</span>
          <span className={styles.credits}>
            {course_data.credit_hours} cr{course_data.lab ? " · Lab" : ""}
          </span>
        </div>
        <div className={styles.title}>{course_data.course_name}</div>
        <div className={styles.faculty}>{faculty_data.faculty_name}</div>
      </div>
      <button
        type="button"
        className={styles.toggle}
        data-on={confirmed}
        aria-pressed={confirmed}
        aria-label={`Toggle enrollment for ${course_data.course_code}: ${course_data.course_name}`}
        onClick={() => onToggle(allocation_id)}
      />
    </div>
  );
}
