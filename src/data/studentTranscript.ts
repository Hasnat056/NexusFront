import type { AdminTranscript } from "../types/api";
import type { TrendPoint } from "../types/dashboard";
import { mockAllEnrollmentsResponse } from "./studentEnrollments";
import { getResultByEnrollmentId } from "./studentResults";

/**
 * Same "doesn't exist for students yet" situation as studentResults.ts — Transcript rows are only
 * ever created through Admin's bulk-generation endpoint (types/api.ts::AdminTranscript's doc
 * comment has the full writeup). This computes the identical rows client-side, using
 * BulkTranscriptSerializer.create()'s exact formula: credit-hour-weighted average of course_gpa
 * per semester, only for semesters where every enrollment is Completed with a Result.
 */
export interface StudentTranscriptRow extends AdminTranscript {
  session: string;
}

export function mockStudentTranscript(): StudentTranscriptRow[] {
  const completed = mockAllEnrollmentsResponse().results.filter((e) => e.status === "Completed");

  const bySemester = new Map<number, typeof completed>();
  for (const e of completed) {
    const semesterId = e.allocation_details.semester_id;
    const list = bySemester.get(semesterId);
    if (list) list.push(e);
    else bySemester.set(semesterId, [e]);
  }

  const rows: StudentTranscriptRow[] = [];
  for (const [semesterId, enrollments] of [...bySemester.entries()].sort(([a], [b]) => a - b)) {
    let totalCredits = 0;
    let weightedGpaSum = 0;
    for (const e of enrollments) {
      const creditHours = e.allocation_details.course_details?.credit_hours ?? 0;
      const result = getResultByEnrollmentId(e.enrollment_id);
      totalCredits += creditHours;
      weightedGpaSum += (result?.course_gpa ?? 0) * creditHours;
    }
    if (totalCredits === 0) continue;

    rows.push({
      student: enrollments[0].student,
      semester: semesterId,
      session: enrollments[0].allocation_details.session,
      total_credits: totalCredits,
      semester_gpa: Math.round((weightedGpaSum / totalCredits) * 100) / 100,
    });
  }
  return rows;
}

/**
 * Not a real backend field — types/api.ts::AdminTranscript's doc comment is explicit that the real
 * Transcript model has "No cumulative/CGPA field" anywhere, even on the Admin side. This is a
 * frontend-only convenience computed the same way any cumulative GPA is: credit-hour-weighted
 * across every semester row, not a re-fetch of anything the API would return.
 */
export function cumulativeGpa(rows: StudentTranscriptRow[]): number {
  const totalCredits = rows.reduce((sum, r) => sum + r.total_credits, 0);
  if (totalCredits === 0) return 0;
  const weightedSum = rows.reduce((sum, r) => sum + r.semester_gpa * r.total_credits, 0);
  return Math.round((weightedSum / totalCredits) * 100) / 100;
}

/** GPA-by-semester as a trend line — the Transcript overview's only chart, one point per
 * completed semester. */
export function selectGpaTrend(rows: StudentTranscriptRow[]): TrendPoint[] {
  return rows.map((r) => ({
    label: r.session,
    value: r.semester_gpa,
    tooltip: `${r.session} (Semester ${r.semester}) — GPA ${r.semester_gpa.toFixed(2)}`,
  }));
}
