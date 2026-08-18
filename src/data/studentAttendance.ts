import type { FacultyDetails, StudentAttendanceSummary, StudentEnrollment } from "../types/api";
import type { StatusTone } from "../types/dashboard";
import { getStudentEnrollmentById, mockStudentEnrollmentsResponse } from "./studentEnrollments";

function asFacultyDetails(value: FacultyDetails | Record<string, never>): FacultyDetails | null {
  return "first_name" in value ? (value as FacultyDetails) : null;
}

export function attendancePercentageTone(percentage: number): StatusTone {
  if (percentage >= 80) return "good";
  if (percentage >= 65) return "warning";
  return "critical";
}

/**
 * 142 (CS-3102) deliberately carries a full semester's worth of lectures (50, seeded-PRNG
 * generated at ~88% attendance, verified 47/50=94%) rather than the 2-4 rows the other courses
 * have — exercises the attendance detail page's filtering at realistic scale instead of only ever
 * being demoed with a handful of rows.
 */
const ATTENDANCE_BY_ALLOCATION: Record<number, { lecture: number; attendance_date: string; is_present: boolean }[]> = {
  142: [
    { lecture: 1, attendance_date: "2026-01-12", is_present: true },
    { lecture: 2, attendance_date: "2026-01-14", is_present: true },
    { lecture: 3, attendance_date: "2026-01-16", is_present: true },
    { lecture: 4, attendance_date: "2026-01-19", is_present: true },
    { lecture: 5, attendance_date: "2026-01-21", is_present: true },
    { lecture: 6, attendance_date: "2026-01-23", is_present: true },
    { lecture: 7, attendance_date: "2026-01-26", is_present: true },
    { lecture: 8, attendance_date: "2026-01-28", is_present: true },
    { lecture: 9, attendance_date: "2026-01-30", is_present: true },
    { lecture: 10, attendance_date: "2026-02-02", is_present: false },
    { lecture: 11, attendance_date: "2026-02-04", is_present: true },
    { lecture: 12, attendance_date: "2026-02-06", is_present: true },
    { lecture: 13, attendance_date: "2026-02-09", is_present: true },
    { lecture: 14, attendance_date: "2026-02-11", is_present: true },
    { lecture: 15, attendance_date: "2026-02-13", is_present: true },
    { lecture: 16, attendance_date: "2026-02-16", is_present: true },
    { lecture: 17, attendance_date: "2026-02-18", is_present: true },
    { lecture: 18, attendance_date: "2026-02-20", is_present: false },
    { lecture: 19, attendance_date: "2026-02-23", is_present: true },
    { lecture: 20, attendance_date: "2026-02-25", is_present: false },
    { lecture: 21, attendance_date: "2026-02-27", is_present: true },
    { lecture: 22, attendance_date: "2026-03-02", is_present: true },
    { lecture: 23, attendance_date: "2026-03-04", is_present: true },
    { lecture: 24, attendance_date: "2026-03-06", is_present: true },
    { lecture: 25, attendance_date: "2026-03-09", is_present: true },
    { lecture: 26, attendance_date: "2026-03-11", is_present: true },
    { lecture: 27, attendance_date: "2026-03-13", is_present: true },
    { lecture: 28, attendance_date: "2026-03-16", is_present: true },
    { lecture: 29, attendance_date: "2026-03-18", is_present: true },
    { lecture: 30, attendance_date: "2026-03-20", is_present: true },
    { lecture: 31, attendance_date: "2026-03-23", is_present: true },
    { lecture: 32, attendance_date: "2026-03-25", is_present: true },
    { lecture: 33, attendance_date: "2026-03-27", is_present: true },
    { lecture: 34, attendance_date: "2026-03-30", is_present: true },
    { lecture: 35, attendance_date: "2026-04-01", is_present: true },
    { lecture: 36, attendance_date: "2026-04-03", is_present: true },
    { lecture: 37, attendance_date: "2026-04-06", is_present: true },
    { lecture: 38, attendance_date: "2026-04-08", is_present: true },
    { lecture: 39, attendance_date: "2026-04-10", is_present: true },
    { lecture: 40, attendance_date: "2026-04-13", is_present: true },
    { lecture: 41, attendance_date: "2026-04-15", is_present: true },
    { lecture: 42, attendance_date: "2026-04-17", is_present: true },
    { lecture: 43, attendance_date: "2026-04-20", is_present: true },
    { lecture: 44, attendance_date: "2026-04-22", is_present: true },
    { lecture: 45, attendance_date: "2026-04-24", is_present: true },
    { lecture: 46, attendance_date: "2026-04-27", is_present: true },
    { lecture: 47, attendance_date: "2026-04-29", is_present: true },
    { lecture: 48, attendance_date: "2026-05-01", is_present: true },
    { lecture: 49, attendance_date: "2026-05-04", is_present: true },
    { lecture: 50, attendance_date: "2026-05-06", is_present: true },
  ],
  156: [
    { lecture: 1, attendance_date: "2026-08-11", is_present: true },
    { lecture: 2, attendance_date: "2026-08-14", is_present: false },
    { lecture: 3, attendance_date: "2026-08-18", is_present: false },
  ],
  163: [
    { lecture: 1, attendance_date: "2026-08-12", is_present: true },
    { lecture: 2, attendance_date: "2026-08-15", is_present: true },
    { lecture: 3, attendance_date: "2026-08-19", is_present: true },
    { lecture: 4, attendance_date: "2026-08-22", is_present: true },
  ],
  171: [
    { lecture: 1, attendance_date: "2026-08-11", is_present: true },
    { lecture: 2, attendance_date: "2026-08-18", is_present: true },
  ],
  179: [
    { lecture: 1, attendance_date: "2026-08-10", is_present: false },
    { lecture: 2, attendance_date: "2026-08-13", is_present: true },
    { lecture: 3, attendance_date: "2026-08-17", is_present: true },
  ],
};

function percentageOf(details: { is_present: boolean }[]): number {
  if (details.length === 0) return 0;
  const attended = details.filter((d) => d.is_present).length;
  return Math.round((attended / details.length) * 100);
}

/**
 * Shaped like GET /api/student/attendance/ — one row per enrollment, each already carrying its
 * full attendance_details (per-lecture) and a server-computed percentage (StudentModule/
 * serializers.py::StudentAttendanceSerializer). The list endpoint alone has everything the detail
 * endpoint (/attendance/<enrollment_id>/) has — same serializer, singular vs. plural — so this
 * single mock array backs both views; no separate per-enrollment store needed.
 */
function buildAttendanceSummary(enrollment: StudentEnrollment): StudentAttendanceSummary {
  const details = ATTENDANCE_BY_ALLOCATION[enrollment.allocation] ?? [];
  return {
    url: `http://localhost:8000/api/student/attendance/${enrollment.enrollment_id}/`,
    faculty_details: asFacultyDetails(enrollment.allocation_details.faculty_details),
    course_details: enrollment.allocation_details.course_details,
    attendance_details: details,
    percentage: percentageOf(details),
  };
}

export const mockStudentAttendance: StudentAttendanceSummary[] =
  mockStudentEnrollmentsResponse.results.map(buildAttendanceSummary);

/**
 * GET /api/student/attendance/<enrollment_id>/ — StudentAttendanceRetrieveAPIView's queryset is
 * any enrollment belonging to the student (StudentModule/views.py::StudentAttendanceRetrieveAPIView.
 * get_queryset), not just the ones already listed on the attendance overview — so this looks the
 * enrollment up live via getStudentEnrollmentById() (which also covers this window's freshly
 * confirmed picks, see studentEnrollments.ts::mockActiveEnrollmentsResponse) instead of only
 * searching the pre-built mockStudentAttendance array, which would 404 on a course the student
 * just enrolled in this session.
 */
export function getStudentAttendanceForEnrollment(enrollmentId: number): StudentAttendanceSummary | undefined {
  const enrollment = getStudentEnrollmentById(enrollmentId);
  return enrollment ? buildAttendanceSummary(enrollment) : undefined;
}

/** Every attendance summary in this app is keyed by its enrollment_id inside `url`
 * (.../attendance/<enrollment_id>/) rather than a bare field — same HyperlinkedIdentityField
 * shape as the real StudentAttendanceSerializer (see doc comment above). */
export function attendanceEnrollmentId(summary: StudentAttendanceSummary): number {
  const match = /\/attendance\/(\d+)\/?$/.exec(summary.url);
  return match ? Number(match[1]) : NaN;
}
