import type { CourseAllocationStatus, FacultyCourseAllocation } from "../types/api";
import type { CourseCardData, StatusTone } from "../types/dashboard";
import { loadPersisted, persist } from "./localPersistence";

/**
 * Shaped like GET /api/faculty/allocations/?status=Ongoing. List rows never
 * carry enrollment_set/lecture_set/assessment_set (see FacultyCourseAllocation
 * doc comment in types/api.ts) and `course` is a bare course_code — no name.
 */
const SEED_FACULTY_ALLOCATIONS: FacultyCourseAllocation[] = [
  {
    urls: "http://localhost:8000/api/faculty/allocations/142/",
    allocation_id: 142,
    faculty: "NUM-FAC-2019-231",
    course: "CS-3102",
    semester: 9,
    session: "Fall 2026",
    status: "Ongoing",
    result_calculation_url: "http://localhost:8000/api/faculty/allocations/142/calculate-result/",
  },
  {
    urls: "http://localhost:8000/api/faculty/allocations/156/",
    allocation_id: 156,
    faculty: "NUM-FAC-2019-231",
    course: "CS-4210",
    semester: 9,
    session: "Fall 2026",
    status: "Ongoing",
    result_calculation_url: "http://localhost:8000/api/faculty/allocations/156/calculate-result/",
  },
  {
    urls: "http://localhost:8000/api/faculty/allocations/163/",
    allocation_id: 163,
    faculty: "NUM-FAC-2019-231",
    course: "MATH-2210",
    semester: 9,
    session: "Fall 2026",
    status: "Completed",
    result_calculation_url: "http://localhost:8000/api/faculty/allocations/163/calculate-result/",
  },
  {
    urls: "http://localhost:8000/api/faculty/allocations/999/",
    allocation_id: 999,
    faculty: "NUM-FAC-2019-231",
    course: "CS-1101",
    semester: 9,
    session: "Fall 2026",
    status: "Completed",
    result_calculation_url: "http://localhost:8000/api/faculty/allocations/999/calculate-result/",
  },
];

export const mockFacultyAllocations: FacultyCourseAllocation[] = loadPersisted(
  "facultyAllocations",
  SEED_FACULTY_ALLOCATIONS,
);

export function saveFacultyAllocations(): void {
  persist("facultyAllocations", mockFacultyAllocations);
}

const ALLOCATION_STATUS_TONE: Record<CourseAllocationStatus, StatusTone> = {
  Ongoing: "good",
  Completed: "good",
  Inactive: "warning",
  Cancelled: "critical",
};

/** Ongoing (currently teaching) sorts first, then Inactive, then Completed/Cancelled last — within
 * each status group, most recent semester first. Used by the full Allocations list page; the
 * dashboard itself only ever shows the Ongoing subset, so it doesn't need this ordering. */
const STATUS_LIST_PRIORITY: Record<CourseAllocationStatus, number> = {
  Ongoing: 0,
  Inactive: 1,
  Completed: 2,
  Cancelled: 3,
};

export function sortFacultyAllocationsForList(allocations: FacultyCourseAllocation[]): FacultyCourseAllocation[] {
  return [...allocations].sort((a, b) => {
    const statusDiff = STATUS_LIST_PRIORITY[a.status] - STATUS_LIST_PRIORITY[b.status];
    if (statusDiff !== 0) return statusDiff;
    if (a.semester !== b.semester) return b.semester - a.semester;
    return b.allocation_id - a.allocation_id;
  });
}

export function selectFacultyCourseCards(allocations: FacultyCourseAllocation[]): CourseCardData[] {
  return allocations.map((allocation) => ({
    id: String(allocation.allocation_id),
    kicker: `ALLOC-${allocation.allocation_id}`,
    title: allocation.course,
    status: { label: allocation.status, tone: ALLOCATION_STATUS_TONE[allocation.status] },
    meta: [allocation.session],
    href: `/faculty/allocations/${allocation.allocation_id}`,
  }));
}
