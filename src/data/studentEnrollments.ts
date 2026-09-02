import type { EnrollmentStatus, StudentAssessment, StudentEnrollment, StudentEnrollmentsResponse } from "../types/api";
import type { CourseCardData, StatusTone } from "../types/dashboard";

const ENROLLMENT_STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  Active: "good",
  Completed: "good",
  Inactive: "warning",
  Dropped: "critical",
};

function facultyName(enrollment: StudentEnrollment): string | null {
  const details = enrollment.allocation_details.faculty_details;
  return "first_name" in details ? `${details.first_name} ${details.last_name}` : null;
}

/** The dashboard's closed-window course grid mirrors GET /api/student/enrollments/?status=Active
 * (StudentEnrollmentListAPIView.filterset_fields includes 'status') — filtered client-side here
 * since the response this consumes is fetched with no status filter and includes Completed rows. */
export function selectStudentCourseCards(response: StudentEnrollmentsResponse): CourseCardData[] {
  return response.results
    .filter((enrollment) => enrollment.status === "Active")
    .map((enrollment) => {
      const course = enrollment.allocation_details.course_details;
      const meta = [
        facultyName(enrollment),
        course ? `${course.credit_hours} credits` : null,
        course?.lab ? "Lab" : null,
        enrollment.allocation_details.session,
      ].filter((part): part is string => part !== null);

      return {
        id: String(enrollment.enrollment_id),
        kicker: course?.course_code ?? "—",
        title: course?.course_name ?? "Untitled course",
        status: { label: enrollment.status, tone: ENROLLMENT_STATUS_TONE[enrollment.status] },
        meta,
        href: `/student/enrollments/${enrollment.enrollment_id}`,
      };
    });
}

/** An assessment's submission window is only open — and only then does the real API even expose
 * the `urls` upload link — while student_submission is true, the deadline (if any) hasn't
 * passed, and the enrollment itself isn't Completed (see StudentAssessmentCheckedSerializer.
 * __init__/get_extra_kwargs in StudentModule/serializers.py). Mirrors that gate client-side so the
 * upload control only ever renders when the real API would actually accept it. */
export function isSubmissionWindowOpen(
  enrollmentStatus: EnrollmentStatus,
  submissionDeadline: string | null | undefined,
): boolean {
  if (enrollmentStatus === "Completed") return false;
  if (!submissionDeadline) return false;
  return new Date(submissionDeadline).getTime() > Date.now();
}

export interface AssessmentGroup {
  label: string;
  items: StudentAssessment[];
}

/** assessment_type is a free-form string on the backend (no fixed choices), so this only fixes
 * the *display order and label* for the types this app's seed data actually uses — any type that
 * doesn't match one of these just gets its own group titled by the raw value, sorted after the
 * known ones. */
const ASSESSMENT_TYPE_GROUPS: { type: string; label: string }[] = [
  { type: "Quiz", label: "Quizzes" },
  { type: "Assignment", label: "Assignments" },
  { type: "Lab", label: "Labs" },
  { type: "Exam", label: "Midterms & Finals" },
  { type: "Project", label: "Projects" },
];

/** Groups a course's assessments by type (Quizzes/Assignments/Labs/Exams/…) instead of one long
 * flat list, each sorted chronologically — requested explicitly, since a mixed list makes it hard
 * to see e.g. "how am I doing on quizzes" at a glance. */
export function groupAssessmentsByType(assessments: StudentAssessment[]): AssessmentGroup[] {
  const byType = new Map<string, StudentAssessment[]>();
  for (const a of assessments) {
    const list = byType.get(a.assessment_type);
    if (list) list.push(a);
    else byType.set(a.assessment_type, [a]);
  }

  const sortByDate = (items: StudentAssessment[]) =>
    [...items].sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));

  const groups: AssessmentGroup[] = [];
  for (const { type, label } of ASSESSMENT_TYPE_GROUPS) {
    const items = byType.get(type);
    if (items) {
      groups.push({ label, items: sortByDate(items) });
      byType.delete(type);
    }
  }
  for (const [type, items] of [...byType.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    groups.push({ label: type, items: sortByDate(items) });
  }
  return groups;
}

export interface DueItem {
  id: string;
  name: string;
  courseLabel: string;
  date: Date;
}

/** Only Active enrollments have coursework still due — a Completed/Dropped enrollment's
 * assessments shouldn't surface here even if one still carries a future submission_deadline. */
export function selectWhatsDue(response: StudentEnrollmentsResponse): DueItem[] {
  const items: DueItem[] = [];
  for (const enrollment of response.results) {
    if (enrollment.status !== "Active") continue;
    const courseCode = enrollment.allocation_details.course_details?.course_code ?? "—";
    for (const assessment of enrollment.allocation_details.assessment_set) {
      if (assessment.submission_deadline) {
        items.push({
          id: `${enrollment.enrollment_id}-${assessment.assessment_id}`,
          name: assessment.assessment_name,
          courseLabel: courseCode,
          date: new Date(assessment.submission_deadline),
        });
      }
    }
  }
  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}
