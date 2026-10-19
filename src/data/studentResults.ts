import type { StudentEnrollment } from "../types/api";

export interface AssessmentMarkRow {
  assessmentId: number;
  name: string;
  type: string;
  obtained: number | null;
  totalMarks: number;
}

export interface CourseResultRow {
  enrollmentId: number;
  semesterId: number;
  courseCode: string;
  courseName: string;
  creditHours: number;
  obtainedMarks: number | null;
  courseGpa: number | null;
  assessments: AssessmentMarkRow[];
}

/** Every graded enrollment's course-level result, straight from the `result` field
 * StudentEnrollmentSerializer nests on each enrollment — null until the enrollment's ALLOCATION
 * (not the enrollment itself) reaches 'Completed', which only happens once the semester actually
 * closes; an enrollment can already show its own status as 'Completed' well before that. Filtering
 * on `result != null` is what actually matches what the API sends, rather than re-deriving
 * readiness from enrollment.status. */
export function selectCourseResults(enrollments: StudentEnrollment[]): CourseResultRow[] {
  return enrollments
    .filter((e) => e.result != null)
    .map((e) => {
      const course = e.allocation_details.course_details;
      return {
        enrollmentId: e.enrollment_id,
        semesterId: e.allocation_details.semester_id,
        courseCode: course?.course_code ?? "—",
        courseName: course?.course_name ?? "Untitled course",
        creditHours: course?.credit_hours ?? 0,
        obtainedMarks: e.result?.obtained_marks ?? null,
        courseGpa: e.result?.course_gpa ?? null,
        assessments: e.allocation_details.assessment_set.map((a) => ({
          assessmentId: a.assessment_id,
          name: a.assessment_name,
          type: a.assessment_type,
          obtained: a.assessmentchecked_set?.obtained ?? null,
          totalMarks: a.total_marks,
        })),
      };
    });
}
