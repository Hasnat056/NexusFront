import type { AdminCourseAllocationSummary, CourseAllocationStatus } from "../types/api";
import type { AllocationListRow, StatusTone } from "../types/dashboard";
import { allSemesterRefs, getSemesterLifecycle, semesterRefById, type SemesterRef } from "./semesterDirectory";
import { mockSessions } from "./sessionDirectory";

export { semesterRefById, type SemesterRef } from "./semesterDirectory";

export const ALLOCATION_STATUS_TONE: Record<CourseAllocationStatus, StatusTone> = {
  Inactive: "warning",
  Active: "good",
  Locked: "warning",
  Completed: "critical",
  Cancelled: "critical",
};

/**
 * Stand-in for GET /api/admin/allocations/. 142/156/171 mirror the exact records already embedded
 * as courseallocation_set entries in data/facultyDirectory.ts's mock Faculty rows — kept in sync
 * by hand across the two files, same tension documented in programDirectory.ts vs
 * academicStructure.ts. 180 (semester 3, "Ongoing") exists so its enrollment can be left ungraded —
 * see data/enrollmentDirectory.ts — demonstrating the real block on setting a semester's
 * closing_deadline while any of its enrollments still lack a result (data/semesterDirectory.ts).
 * No allocation is eligible-for-creation out of the box any more: eligibleSemestersForAllocation()
 * now also requires the target semester's own activation_deadline to be set (matching the real
 * queryset exactly), and no semester has one pre-seeded — see semesterDirectory.ts's seed comment
 * for which semester to set one on first.
 */
export const mockAllocations: AdminCourseAllocationSummary[] = [
  {
    urls: "/api/admin/allocations/100/",
    allocation_id: 100,
    faculty: "NUM-CS-2019-008",
    course: "CS-1101",
    semester: 1,
    session: "Fall 2025",
    status: "Completed",
    passing_threshold: 50,
  },
  {
    urls: "/api/admin/allocations/101/",
    allocation_id: 101,
    faculty: "NUM-MATH-2016-002",
    course: "MATH-2210",
    semester: 2,
    session: "Fall 2025",
    status: "Cancelled",
    passing_threshold: 50,
  },
  {
    urls: "/api/admin/allocations/142/",
    allocation_id: 142,
    faculty: "NUM-CS-2019-008",
    course: "CS-3102",
    semester: 7,
    session: "Fall 2026",
    status: "Active",
    passing_threshold: 50,
  },
  {
    urls: "/api/admin/allocations/156/",
    allocation_id: 156,
    faculty: "NUM-CS-2019-008",
    course: "CS-4210",
    semester: 7,
    session: "Fall 2026",
    status: "Active",
    passing_threshold: 50,
  },
  {
    urls: "/api/admin/allocations/171/",
    allocation_id: 171,
    faculty: "NUM-EE-2021-014",
    course: "EE-2101",
    semester: 7,
    session: "Fall 2026",
    status: "Active",
    passing_threshold: 50,
  },
  {
    urls: "/api/admin/allocations/180/",
    allocation_id: 180,
    faculty: "NUM-CS-2019-008",
    course: "CS-4210",
    semester: 3,
    session: "Fall 2026",
    status: "Active",
    passing_threshold: 50,
  },
];

/**
 * Mirrors CourseAllocationSerializer.get_fields()'s writable `semester` queryset:
 * `Semester.objects.filter(status='Inactive', session__status='Initiated', activation_deadline__
 * isnull=False)` — the semester must be Inactive, its session Initiated, AND its own
 * activation_deadline already scheduled (data/semesterDirectory.ts is what now tracks that field).
 */
export function eligibleSemestersForAllocation(): SemesterRef[] {
  return allSemesterRefs().filter((s) => {
    if (s.status !== "Inactive" || s.session === null) return false;
    if (getSemesterLifecycle(s.semesterId).activation_deadline === null) return false;
    return mockSessions.find((session) => session.id === s.session)?.status === "Initiated";
  });
}

export function sessionLabelForSemester(session: number | null): string {
  if (session === null) return "—";
  const found = mockSessions.find((s) => s.id === session);
  return found ? `${found.period} ${found.year}` : `#${session}`;
}

export function selectAllocationListRows(allocations: AdminCourseAllocationSummary[]): AllocationListRow[] {
  return allocations.map((a) => {
    const semester = semesterRefById(a.semester);
    return {
      allocationId: a.allocation_id,
      faculty: a.faculty,
      course: a.course,
      semesterLabel: semester ? `${semester.classLabel} · Semester ${semester.semesterNo}` : `#${a.semester}`,
      session: a.session,
      status: { label: a.status, tone: ALLOCATION_STATUS_TONE[a.status] },
      detailHref: `/admin/allocations/${a.allocation_id}`,
    };
  });
}

export function getAllocationById(allocationId: number): AdminCourseAllocationSummary | undefined {
  return mockAllocations.find((a) => a.allocation_id === allocationId);
}

/** Mirrors AdminCourseAllocationPermissions' object-level check: Admin can only edit/delete an
 * allocation while it's still 'Inactive' — once it moves to Ongoing/Completed/Cancelled it's
 * GET-only. */
export function isAllocationEditable(allocation: AdminCourseAllocationSummary): boolean {
  return allocation.status === "Inactive";
}

export interface AllocationFormValue {
  faculty: string;
  course: string;
  semester: string;
}

export function emptyAllocationFormValue(): AllocationFormValue {
  return { faculty: "", course: "", semester: "" };
}

/** Mirrors the unique_together=('faculty','course','semester') constraint on CourseAllocation
 * (Models/models.py). */
export function validateAllocationUnique(
  faculty: string,
  course: string,
  semester: number,
  excludeAllocationId?: number,
): string | null {
  const clash = mockAllocations.find(
    (a) =>
      a.faculty === faculty &&
      a.course === course &&
      a.semester === semester &&
      a.allocation_id !== excludeAllocationId,
  );
  return clash ? "This faculty member is already allocated to this course for this semester." : null;
}

/** Mirrors CourseAllocationSerializer.create(): `session` is copied from the chosen semester's
 * session automatically, `status` always starts 'Inactive' — neither is client-supplied. Also
 * mirrors the real 400 when `course` isn't one of that semester's scheme_of_studies courses. */
export function createAllocation(input: AllocationFormValue): AdminCourseAllocationSummary | string {
  const semester = semesterRefById(Number(input.semester));
  if (!semester) return "Select a semester.";
  if (!semester.courseCodes.includes(input.course)) {
    return `${input.course} isn't in this semester's scheme of studies (allowed: ${semester.courseCodes.join(", ") || "none"}).`;
  }
  const uniqueError = validateAllocationUnique(input.faculty, input.course, semester.semesterId);
  if (uniqueError) return uniqueError;

  const nextId = mockAllocations.reduce((max, a) => Math.max(max, a.allocation_id), 0) + 1;
  const record: AdminCourseAllocationSummary = {
    urls: `/api/admin/allocations/${nextId}/`,
    allocation_id: nextId,
    faculty: input.faculty,
    course: input.course,
    semester: semester.semesterId,
    session: sessionLabelForSemester(semester.session),
    status: "Inactive",
    passing_threshold: 50,
  };
  mockAllocations.push(record);
  return record;
}

export function updateAllocation(allocationId: number, input: AllocationFormValue): AdminCourseAllocationSummary | string | undefined {
  const record = getAllocationById(allocationId);
  if (!record || !isAllocationEditable(record)) return undefined;

  const semester = semesterRefById(Number(input.semester));
  if (!semester) return "Select a semester.";
  if (!semester.courseCodes.includes(input.course)) {
    return `${input.course} isn't in this semester's scheme of studies (allowed: ${semester.courseCodes.join(", ") || "none"}).`;
  }
  const uniqueError = validateAllocationUnique(input.faculty, input.course, semester.semesterId, allocationId);
  if (uniqueError) return uniqueError;

  record.faculty = input.faculty;
  record.course = input.course;
  record.semester = semester.semesterId;
  record.session = sessionLabelForSemester(semester.session);
  return record;
}

/** Mirrors CourseAllocationRetrieveUpdateDestroyAPIView — a real synchronous delete, no
 * ChangeRequest gate, but only reachable while the allocation is still 'Inactive'. */
export function deleteAllocation(allocationId: number): boolean {
  const record = getAllocationById(allocationId);
  if (!record || !isAllocationEditable(record)) return false;
  const index = mockAllocations.findIndex((a) => a.allocation_id === allocationId);
  mockAllocations.splice(index, 1);
  return true;
}
