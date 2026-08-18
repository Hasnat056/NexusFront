import { Link } from "react-router-dom";
import type { StudentAttendanceSummary } from "../../types/api";
import { attendanceEnrollmentId, attendancePercentageTone } from "../../data/studentAttendance";
import { Tag } from "./Tag";
import { AttendanceDots } from "./AttendanceDots";
import formStyles from "./Form.module.css";
import styles from "./AttendanceCard.module.css";

interface AttendanceCardProps {
  summary: StudentAttendanceSummary;
}

export function AttendanceCard({ summary }: AttendanceCardProps) {
  const { course_details: course, faculty_details: faculty, attendance_details, percentage } = summary;
  const tone = attendancePercentageTone(percentage);
  const attended = attendance_details.filter((d) => d.is_present).length;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div>
          <div className={styles.kicker}>{course?.course_code ?? "—"}</div>
          <div className={styles.title}>{course?.course_name ?? "Untitled course"}</div>
          {faculty && (
            <div className={styles.faculty}>
              {faculty.first_name} {faculty.last_name}
            </div>
          )}
        </div>
        <Tag tone={tone}>{`${percentage}%`}</Tag>
      </div>

      {attendance_details.length > 0 ? (
        <>
          <div className={styles.scoreRow}>
            <span className={styles.scoreValue} data-tone={tone}>
              {percentage}%
            </span>
            <span className={styles.scoreLabel}>
              {attended} / {attendance_details.length} lectures attended
            </span>
          </div>

          <AttendanceDots attendance={attendance_details} max={30} />

          <Link to={`/student/attendance/${attendanceEnrollmentId(summary)}`} className={`${formStyles.linkButton} ${styles.toggle}`}>
            View lecture history →
          </Link>
        </>
      ) : (
        <p className={styles.empty}>No lectures recorded yet.</p>
      )}
    </div>
  );
}
