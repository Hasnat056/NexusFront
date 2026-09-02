import type { CourseAllocationStatus, FacultyCourseAllocation } from "../types/api";
import type { CourseCardData, StatusTone } from "../types/dashboard";

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
