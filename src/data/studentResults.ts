import type { AdminEnrollmentResult, StudentAssessment } from "../types/api";
import { mockAllEnrollmentsResponse } from "./studentEnrollments";

/**
 * There is no student-facing results/transcript endpoint anywhere in NexusAPI — grepped
 * StudentModule top to bottom, nothing there references Result or Transcript at all. Both models
 * exist and are fully wired up on the Admin/Faculty side (Result is 1:1 with Enrollment, set by
 * FacultyModule's result-calculation flow; Transcript is Admin's semester-level rollup — see
 * types/api.ts::AdminTranscript's doc comment for the full real-endpoint writeup), but a student
 * has no route to read their own. This module computes both anyway, using the exact same formulas
 * the real backend uses (see below), because the underlying data genuinely exists — it's just that
 * the read path for a student hasn't been built server-side yet. Treat this file as "what GET
 * /api/student/results/ would return if it existed," not as fetching a real endpoint.
 */

/**
 * Mirrors AdminModule/mixins.py::ResultCalculationMixin.calculate_gpa's absolute-grading branch
 * (used whenever a course has fewer than 20 graded students — true for every course this student
 * has ever taken, so the bell-curve branch never applies here). Exact cutoffs and GPA values
 * reproduced verbatim from the backend.
 */
export function courseGpaFromMarks(obtained: number): number {
  if (obtained >= 85) return 4.0;
  if (obtained >= 80) return 3.67;
  if (obtained >= 75) return 3.33;
  if (obtained >= 70) return 3.0;
  if (obtained >= 65) return 2.67;
  if (obtained >= 61) return 2.33;
  if (obtained >= 58) return 2.0;
  if (obtained >= 55) return 1.67;
  if (obtained >= 50) return 1.0;
  return 0.0;
}

/**
 * Weightage for each of the 4 assessments data/studentEnrollments.ts builds a completed course's
 * assessment_set from (Quiz/Assignment/Midterm/Final, in that order — see
 * COMPLETED_COURSE_ASSESSMENT_SPECS there). The live GET /api/student/enrollments/ response never
 * carries this — StudentAssessment has no weightage field, matching StudentAssessmentSerializer's
 * real field list, since a student's course listing isn't the place a percentage-of-final-grade
 * belongs. But a Results/grade-report view exists specifically to explain how a final grade was
 * derived, and the real Assessment model (Faculty's own side) does have a weightage column — this
 * is the same number FacultyModule's ResultCalculationMixin.calculate_result() actually used
 * server-side, just not one any student-facing serializer echoes back. Surfacing it here, on the
 * derived Results view only (never on the plain enrollment assessment_set), is showing the real
 * number in the one place it belongs, not inventing one.
 */
const ASSESSMENT_WEIGHTAGE = [15, 15, 30, 40];

export interface AssessmentBreakdownRow {
  assessmentId: number;
  name: string;
  type: string;
  obtained: number | null;
  totalMarks: number;
  weightage: number;
  /** (obtained / totalMarks) * weightage — this assessment's actual contribution to obtained_marks. */
  contribution: number;
}

function buildBreakdown(assessments: StudentAssessment[]): AssessmentBreakdownRow[] {
  return assessments.map((a, i) => {
    const obtained = a.assessmentchecked_set?.obtained ?? null;
    const weightage = ASSESSMENT_WEIGHTAGE[i] ?? 0;
    const contribution = obtained != null ? Math.round((obtained / a.total_marks) * weightage * 100) / 100 : 0;
    return {
      assessmentId: a.assessment_id,
      name: a.assessment_name,
      type: a.assessment_type,
      obtained,
      totalMarks: a.total_marks,
      weightage,
      contribution,
    };
  });
}

/** Mirrors ResultCalculationMixin.calculate_result(): sum((obtained/total_marks)*weightage) across
 * every graded assessment on the enrollment. */
function computeObtainedMarks(breakdown: AssessmentBreakdownRow[]): number {
  const sum = breakdown.reduce((total, row) => total + row.contribution, 0);
  return Math.round(sum * 100) / 100;
}

/** One Result per Completed enrollment (Models/models.py::Result is OneToOneField(Enrollment)).
 * result_id values are well clear of any real result_id used elsewhere in this app's mock data. */
function buildResult(enrollmentId: number, obtainedMarks: number): AdminEnrollmentResult {
  return {
    result_id: 9500 + enrollmentId,
    obtained_marks: obtainedMarks,
    course_gpa: courseGpaFromMarks(obtainedMarks),
  };
}

const RESULT_BY_ENROLLMENT_ID: Record<number, AdminEnrollmentResult> = Object.fromEntries(
  mockAllEnrollmentsResponse()
    .results.filter((e) => e.status === "Completed")
    .map((e) => [e.enrollment_id, buildResult(e.enrollment_id, computeObtainedMarks(buildBreakdown(e.allocation_details.assessment_set)))]),
);

export function getResultByEnrollmentId(enrollmentId: number): AdminEnrollmentResult | null {
  return RESULT_BY_ENROLLMENT_ID[enrollmentId] ?? null;
}

export interface CourseResultRow {
  enrollmentId: number;
  semesterId: number;
  courseCode: string;
  courseName: string;
  creditHours: number;
  obtainedMarks: number;
  courseGpa: number;
  breakdown: AssessmentBreakdownRow[];
}

/** Every Completed enrollment with a Result — the per-course breakdown a transcript is built from. */
export function selectCourseResults(): CourseResultRow[] {
  return mockAllEnrollmentsResponse()
    .results.filter((e) => e.status === "Completed")
    .map((e) => {
      const result = getResultByEnrollmentId(e.enrollment_id);
      const course = e.allocation_details.course_details;
      return {
        enrollmentId: e.enrollment_id,
        semesterId: e.allocation_details.semester_id,
        courseCode: course?.course_code ?? "—",
        courseName: course?.course_name ?? "Untitled course",
        creditHours: course?.credit_hours ?? 0,
        obtainedMarks: result?.obtained_marks ?? 0,
        courseGpa: result?.course_gpa ?? 0,
        breakdown: buildBreakdown(e.allocation_details.assessment_set),
      };
    });
}
