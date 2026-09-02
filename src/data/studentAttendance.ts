import type { StudentAttendanceSummary } from "../types/api";
import type { StatusTone } from "../types/dashboard";

export function attendancePercentageTone(percentage: number): StatusTone {
  if (percentage >= 80) return "good";
  if (percentage >= 65) return "warning";
  return "critical";
}

/** Every attendance summary in this app is keyed by its enrollment_id inside `url`
 * (.../attendance/<enrollment_id>/) rather than a bare field — same HyperlinkedIdentityField
 * shape as the real StudentAttendanceSerializer (StudentModule/serializers.py). */
export function attendanceEnrollmentId(summary: StudentAttendanceSummary): number {
  const match = /\/attendance\/(\d+)\/?$/.exec(summary.url);
  return match ? Number(match[1]) : NaN;
}
