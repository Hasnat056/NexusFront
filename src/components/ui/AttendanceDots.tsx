import type { LectureAttendanceEntry } from "../../types/api";
import styles from "./AttendanceDots.module.css";

interface AttendanceDotsProps {
  attendance: LectureAttendanceEntry[];
  /** Caps how many dots render before collapsing the rest into a "+N more" label — omit to
   * always show every lecture (used on the enrollment detail page and the dedicated attendance
   * detail page; the attendance overview cards pass a cap to stay compact). */
  max?: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function AttendanceDots({ attendance, max }: AttendanceDotsProps) {
  const shown = max ? attendance.slice(0, max) : attendance;
  const hidden = attendance.length - shown.length;

  return (
    <div className={styles.dots}>
      {shown.map((d) => (
        <span
          key={d.lecture}
          className={styles.dot}
          data-present={d.is_present}
          title={`Lecture ${d.lecture} — ${formatDate(d.attendance_date)} — ${d.is_present ? "Present" : "Absent"}`}
        />
      ))}
      {hidden > 0 && <span className={styles.more}>+{hidden} more</span>}
    </div>
  );
}
