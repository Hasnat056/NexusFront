import type { AdminEnrollmentSummary, EnrollmentStatus } from "../types/api";
import type { EnrollmentListRow, StatusTone } from "../types/dashboard";
import { getAllocationById, mockAllocations, semesterRefById } from "./allocationDirectory";
import { mockStudentDirectory } from "./studentDirectory";

export const ENROLLMENT_STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  Inactive: "warning",
  Active: "good",
  Locked: "warning",
  Completed: "critical",
  Dropped: "critical",
};

function studentInfo(studentId: string): { student_id: string; student_name: string } | null {
  const record = mockStudentDirectory.find((s) => s.person.person_id === studentId);
  return record ? { student_id: studentId, student_name: `${record.person.first_name} ${record.person.last_name}` } : null;
}

/**
 * Stand-in for GET /api/admin/enrollments/. 4471/4472 mirror the exact records already embedded
 * in data/studentDirectory.ts's Lucia Ferreira record (enrollment_set) — kept in sync by hand,
 * same tension documented in allocationDirectory.ts. 4470 has a populated `result`, demonstrating
 * the real API's delete-block once a GPA exists; 4473 is Dropped, showing that status's tone.
 * 4474 is left ungraded (result: null) against allocation 180 (semester 3) so
 * data/semesterDirectory.ts's closing_deadline block has something real to demonstrate.
 */
export const mockEnrollments: AdminEnrollmentSummary[] = [
  {
    urls: "/api/admin/enrollments/4470/",
    enrollment_id: 4470,
    student: "NUM-CS-BS-2023-114",
    student_info: studentInfo("NUM-CS-BS-2023-114"),
    allocation: 100,
    enrollment_date: "2025-08-05",
    status: "Completed",
    result: { result_id: 1, obtained_marks: 82, course_gpa: 3.7 },
  },
  {
    urls: "/api/admin/enrollments/4471/",
    enrollment_id: 4471,
    student: "NUM-CS-BS-2023-114",
    student_info: studentInfo("NUM-CS-BS-2023-114"),
    allocation: 142,
    enrollment_date: "2026-08-01",
    status: "Active",
    result: null,
  },
  {
    urls: "/api/admin/enrollments/4472/",
    enrollment_id: 4472,
    student: "NUM-CS-BS-2023-114",
    student_info: studentInfo("NUM-CS-BS-2023-114"),
    allocation: 156,
    enrollment_date: "2026-08-01",
    status: "Active",
    result: null,
  },
  {
    urls: "/api/admin/enrollments/4473/",
    enrollment_id: 4473,
    student: "NUM-CS-BS-2022-039",
    student_info: studentInfo("NUM-CS-BS-2022-039"),
    allocation: 142,
    enrollment_date: "2026-08-01",
    status: "Dropped",
    result: null,
  },
  {
    urls: "/api/admin/enrollments/4474/",
    enrollment_id: 4474,
    student: "NUM-CS-BS-2023-114",
    student_info: studentInfo("NUM-CS-BS-2023-114"),
    allocation: 180,
    enrollment_date: "2026-08-10",
    status: "Active",
    result: null,
  },
];

/** Mirrors EnrollmentSerializer.get_fields()'s writable `allocation` queryset: only allocations
 * with status='Active' are choosable. */
export function eligibleAllocationsForEnrollment() {
  return mockAllocations.filter((a) => a.status === "Active");
}

function allocationLabel(allocationId: number): string {
  const allocation = getAllocationById(allocationId);
  if (!allocation) return `#${allocationId}`;
  const semester = semesterRefById(allocation.semester);
  return `${allocation.course} · ${semester ? semester.classLabel : `Semester #${allocation.semester}`} · ${allocation.session}`;
}

export function selectEnrollmentListRows(enrollments: AdminEnrollmentSummary[]): EnrollmentListRow[] {
  return enrollments.map((e) => ({
    enrollmentId: e.enrollment_id,
    student: e.student,
    studentName: e.student_info?.student_name ?? e.student,
    allocationLabel: allocationLabel(e.allocation),
    enrollmentDate: e.enrollment_date,
    status: { label: e.status, tone: ENROLLMENT_STATUS_TONE[e.status] },
    courseGpa: e.result?.course_gpa ?? null,
    detailHref: `/admin/enrollments/${e.enrollment_id}`,
  }));
}

export function getEnrollmentById(enrollmentId: number): AdminEnrollmentSummary | undefined {
  return mockEnrollments.find((e) => e.enrollment_id === enrollmentId);
}

/** Mirrors AdminEnrollmentPermissions' object-level check: Admin can act while status is
 * 'Active'/'Inactive'/'Dropped'; once 'Completed' it's GET-only. */
export function isEnrollmentEditable(enrollment: AdminEnrollmentSummary): boolean {
  return enrollment.status !== "Completed";
}

/** Mirrors EnrollmentRetrieveUpdateDestroyAPIView.perform_destroy: blocked once a Result with a
 * course_gpa exists (here: once `result` is populated at all — this mock doesn't model a Result
 * row existing with an unset course_gpa, see types/api.ts::AdminEnrollmentSummary), on top of the
 * same status!='Completed' permission gate as edits. */
export function isEnrollmentDeletable(enrollment: AdminEnrollmentSummary): boolean {
  return isEnrollmentEditable(enrollment) && enrollment.result === null;
}

export interface EnrollmentFormValue {
  student: string;
  allocation: string;
}

export function emptyEnrollmentFormValue(): EnrollmentFormValue {
  return { student: "", allocation: "" };
}

/** Mirrors unique_together=('student','allocation') on Enrollment (Models/models.py). */
export function validateEnrollmentUnique(student: string, allocation: number): string | null {
  const clash = mockEnrollments.find((e) => e.student === student && e.allocation === allocation);
  return clash ? "This student is already enrolled in this allocation." : null;
}

/** Mirrors EnrollmentSerializer.create(): status starts at the model default ('Inactive') since
 * create() doesn't force it to 'Active', and a blank Result row is auto-created (represented here
 * as `result: null`, this mock's stand-in for "no course_gpa yet"). The AssessmentChecked
 * auto-creation per existing Assessment isn't modeled — Assessment isn't a resource here. */
export function createEnrollment(input: EnrollmentFormValue): AdminEnrollmentSummary | string {
  const allocationId = Number(input.allocation);
  const allocation = getAllocationById(allocationId);
  if (!allocation || allocation.status !== "Active") return "Select an active allocation.";
  const uniqueError = validateEnrollmentUnique(input.student, allocationId);
  if (uniqueError) return uniqueError;

  const nextId = mockEnrollments.reduce((max, e) => Math.max(max, e.enrollment_id), 0) + 1;
  const record: AdminEnrollmentSummary = {
    urls: `/api/admin/enrollments/${nextId}/`,
    enrollment_id: nextId,
    student: input.student,
    student_info: studentInfo(input.student),
    allocation: allocationId,
    enrollment_date: new Date().toISOString().slice(0, 10),
    status: "Inactive",
    result: null,
  };
  mockEnrollments.push(record);
  return record;
}

export function updateEnrollmentStatus(enrollmentId: number, status: EnrollmentStatus): AdminEnrollmentSummary | undefined {
  const record = getEnrollmentById(enrollmentId);
  if (!record || !isEnrollmentEditable(record)) return undefined;
  record.status = status;
  return record;
}

export function deleteEnrollment(enrollmentId: number): boolean {
  const record = getEnrollmentById(enrollmentId);
  if (!record || !isEnrollmentDeletable(record)) return false;
  const index = mockEnrollments.findIndex((e) => e.enrollment_id === enrollmentId);
  mockEnrollments.splice(index, 1);
  return true;
}
