import type { StudentEnrollment, StudentTranscript } from "../types/api";
import type { TrendPoint } from "../types/dashboard";

export interface SemesterRow extends StudentTranscript {
  session: string;
}

/** GET /api/student/transcripts/ rows carry no session label — just the numeric semester id —
 * so it's looked up from this student's own enrollments, which do carry it per allocation. */
export function withSessionLabels(transcripts: StudentTranscript[], enrollments: StudentEnrollment[]): SemesterRow[] {
  return transcripts
    .map((t) => {
      const match = enrollments.find((e) => e.allocation_details.semester_id === t.semester);
      return { ...t, session: match?.allocation_details.session ?? `Semester ${t.semester}` };
    })
    .sort((a, b) => a.semester - b.semester);
}

/** Not a real backend field — Transcript has no cumulative/CGPA field anywhere (see
 * types/api.ts::AdminTranscript's doc comment). Computed the same way any cumulative GPA is:
 * credit-hour-weighted across every semester row. */
export function cumulativeGpa(rows: StudentTranscript[]): number {
  const totalCredits = rows.reduce((sum, r) => sum + r.total_credits, 0);
  if (totalCredits === 0) return 0;
  const weightedSum = rows.reduce((sum, r) => sum + Number(r.semester_gpa) * r.total_credits, 0);
  return Math.round((weightedSum / totalCredits) * 100) / 100;
}

/** GPA-by-semester as a trend line — the Transcript overview's only chart, one point per
 * completed semester. */
export function selectGpaTrend(rows: SemesterRow[]): TrendPoint[] {
  return rows.map((r) => ({
    label: r.session,
    value: Number(r.semester_gpa),
    tooltip: `${r.session} (Semester ${r.semester}) — GPA ${Number(r.semester_gpa).toFixed(2)}`,
  }));
}
