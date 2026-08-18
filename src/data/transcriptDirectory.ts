import type { AdminTranscript } from "../types/api";
import type { TranscriptListRow } from "../types/dashboard";
import { mockAllocations } from "./allocationDirectory";
import { mockCourses } from "./courseDirectory";
import { mockEnrollments } from "./enrollmentDirectory";
import { getSemesterView, semesterRefById } from "./semesterDirectory";
import { mockStudentDirectory } from "./studentDirectory";

/**
 * Stand-in for GET /api/admin/transcripts/. No `id`/`url` field exists on the real serializer and
 * there's no detail route (see types/api.ts::AdminTranscript) — rows are keyed on the
 * (student, semester) pair, matching the model's own unique_together. Seeded to match CS-BS-2023
 * Semester 1 (already "Completed"): Lucia Ferreira's one Completed enrollment there (CS-1101, 4
 * credit hours, course_gpa 3.7) rolls up to total_credits=4, semester_gpa=3.70 — exactly the
 * credit-hour-weighted average BulkTranscriptSerializer.create() would have produced.
 */
export const mockTranscripts: AdminTranscript[] = [
  { student: "NUM-CS-BS-2023-114", semester: 1, total_credits: 4, semester_gpa: 3.7 },
];

function studentName(studentId: string): string {
  const record = mockStudentDirectory.find((s) => s.person.person_id === studentId);
  return record ? `${record.person.first_name} ${record.person.last_name}` : studentId;
}

export function selectTranscriptListRows(transcripts: AdminTranscript[]): TranscriptListRow[] {
  return transcripts.map((t) => {
    const semester = semesterRefById(t.semester);
    return {
      student: t.student,
      studentName: studentName(t.student),
      studentHref: `/admin/students/${t.student}`,
      semesterId: t.semester,
      semesterLabel: semester ? `${semester.classLabel} · Semester ${semester.semesterNo}` : `#${t.semester}`,
      semesterHref: `/admin/semesters/${t.semester}`,
      totalCredits: t.total_credits,
      semesterGpa: t.semester_gpa,
    };
  });
}

export interface TranscriptStudentError {
  student: string;
  message: string;
}

export type GenerateTranscriptsResult =
  | { ok: true; created: AdminTranscript[] }
  | { ok: false; message: string }
  | { ok: false; studentErrors: TranscriptStudentError[] };

/**
 * Stand-in for POST /api/admin/semesters/<semester_id>/transcripts-create/ (body `{"confirm":
 * true}` in the real API — nothing else to submit, semester comes from the URL). Mirrors
 * BulkTranscriptSerializer.create() step for step: status=='Completed' blocks first (a proxy for
 * "already generated", not a real Transcript-table check); then every enrolled student's
 * enrollments are checked for a missing course_gpa — any offender aborts the whole batch (nothing
 * created, transaction.atomic in the real backend); only then, per student with every enrollment
 * 'Completed', semester_gpa is computed as the credit-hour-weighted average and total_credits as
 * the summed credit hours, aborting immediately if that sum is 0. Students whose enrollments
 * aren't all 'Completed' are silently skipped — same quirk the single-record TranscriptSerializer
 * has.
 */
export function generateTranscripts(semesterId: number): GenerateTranscriptsResult {
  const view = getSemesterView(semesterId);
  if (!view) return { ok: false, message: "Semester not found." };
  if (view.status === "Completed") return { ok: false, message: "Transcripts already exists for this semester." };

  const allocations = mockAllocations.filter((a) => a.semester === semesterId);
  const allocationIds = allocations.map((a) => a.allocation_id);
  const enrollments = mockEnrollments.filter((e) => allocationIds.includes(e.allocation));

  const byStudent = new Map<string, typeof enrollments>();
  for (const e of enrollments) {
    if (!byStudent.has(e.student)) byStudent.set(e.student, []);
    byStudent.get(e.student)!.push(e);
  }

  if (byStudent.size === 0) {
    return { ok: false, message: "No students are enrolled under this semester's allocations." };
  }

  const studentErrors: TranscriptStudentError[] = [];
  for (const [studentId, studentEnrollments] of byStudent) {
    const ungraded = studentEnrollments.filter((e) => e.result === null).length;
    if (ungraded > 0) {
      studentErrors.push({ student: studentId, message: `${ungraded} enrollment(s) still missing a result.` });
    }
  }
  if (studentErrors.length > 0) return { ok: false, studentErrors };

  const created: AdminTranscript[] = [];
  for (const [studentId, studentEnrollments] of byStudent) {
    const allCompleted = studentEnrollments.every((e) => e.status === "Completed");
    if (!allCompleted) continue;

    if (mockTranscripts.some((t) => t.student === studentId && t.semester === semesterId)) continue;

    let totalCredits = 0;
    let weightedGpaSum = 0;
    for (const e of studentEnrollments) {
      const allocation = allocations.find((a) => a.allocation_id === e.allocation);
      const creditHours = allocation ? (mockCourses.find((c) => c.course_code === allocation.course)?.credit_hours ?? 0) : 0;
      totalCredits += creditHours;
      weightedGpaSum += (e.result?.course_gpa ?? 0) * creditHours;
    }
    if (totalCredits === 0) {
      return { ok: false, message: `${studentId} has no credit-bearing completed enrollments — nothing to generate.` };
    }

    const record: AdminTranscript = {
      student: studentId,
      semester: semesterId,
      total_credits: totalCredits,
      semester_gpa: Math.round((weightedGpaSum / totalCredits) * 100) / 100,
    };
    mockTranscripts.push(record);
    created.push(record);
  }

  if (created.length === 0) {
    return { ok: false, message: "No students here have every enrollment marked Completed yet — nothing to generate." };
  }
  return { ok: true, created };
}
