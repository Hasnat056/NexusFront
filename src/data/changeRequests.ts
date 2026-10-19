import type { ChangeRequest } from "../types/api";
import type { StatusTone } from "../types/dashboard";
import { loadPersisted, persist } from "./localPersistence";

export const CHANGE_REQUEST_STATUS_TONE: Record<ChangeRequest["status"], StatusTone> = {
  pending: "warning",
  confirmed: "good",
  applied: "good",
  declined: "critical",
  expired: "critical",
};

export const CHANGE_REQUEST_STATUS_LABEL: Record<ChangeRequest["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  applied: "Applied",
  declined: "Declined",
  expired: "Expired",
};

/**
 * Stand-in for GET /api/admin/requests/ (AdminModule/views.py::ChangeRequestListAPIView) — the
 * full queue, every status, not just pending; the queue page at /admin/requests shows all of it
 * with a status filter. Still used by data/departmentDirectory.ts.
 */
const SEED_CHANGE_REQUESTS: ChangeRequest[] = [
  {
    id: 41,
    change_type: "result_calculation",
    status: "pending",
    department: null,
    new_hod: null,
    target_allocation: 410,
    target_faculty: null,
    target_student: null,
    requested_by: 12,
    requested_at: "2026-07-31T14:02:00Z",
    confirmed_at: null,
    applied_at: null,
  },
  {
    id: 38,
    change_type: "hod_change",
    status: "confirmed",
    department: "EE",
    new_hod: "NUM-EE-2021-014",
    target_allocation: null,
    target_faculty: null,
    target_student: null,
    requested_by: 3,
    requested_at: "2026-07-30T09:41:00Z",
    confirmed_at: "2026-07-30T15:12:00Z",
    applied_at: null,
  },
  {
    id: 35,
    change_type: "faculty_delete",
    status: "pending",
    department: null,
    new_hod: null,
    target_allocation: null,
    target_faculty: "NUM-CS-2019-008",
    target_student: null,
    requested_by: 3,
    requested_at: "2026-07-28T16:15:00Z",
    confirmed_at: null,
    applied_at: null,
  },
  {
    id: 44,
    change_type: "hod_change",
    status: "applied",
    department: "BIO",
    new_hod: "NUM-MATH-2016-002",
    target_allocation: null,
    target_faculty: null,
    target_student: null,
    requested_by: 1,
    requested_at: "2026-08-02T10:00:00Z",
    confirmed_at: "2026-08-02T11:30:00Z",
    applied_at: "2026-08-02T11:35:00Z",
  },
  {
    id: 30,
    change_type: "student_delete",
    status: "declined",
    department: null,
    new_hod: null,
    target_allocation: null,
    target_faculty: null,
    target_student: "NUM-CS-BS-2022-039",
    requested_by: 3,
    requested_at: "2026-07-20T08:45:00Z",
    confirmed_at: null,
    applied_at: "2026-07-21T09:10:00Z",
  },
  {
    id: 22,
    change_type: "result_calculation",
    status: "expired",
    department: null,
    new_hod: null,
    target_allocation: 156,
    target_faculty: null,
    target_student: null,
    requested_by: 8,
    requested_at: "2026-07-10T13:20:00Z",
    confirmed_at: null,
    applied_at: null,
  },
  // Marcus Webb's (NUM-FAC-2019-231, requested_by 231) own result_calculation requests — same
  // three allocations his Faculty portal mock world already tracks (data/facultyAllocations.ts):
  // 142 still pending admin review, 156 confirmed and ready for him to apply, 163 already applied.
  {
    id: 51,
    change_type: "result_calculation",
    status: "pending",
    department: null,
    new_hod: null,
    target_allocation: 142,
    target_faculty: null,
    target_student: null,
    requested_by: 231,
    requested_at: "2026-08-01T10:15:00Z",
    confirmed_at: null,
    applied_at: null,
  },
  {
    id: 47,
    change_type: "result_calculation",
    status: "confirmed",
    department: null,
    new_hod: null,
    target_allocation: 156,
    target_faculty: null,
    target_student: null,
    requested_by: 231,
    requested_at: "2026-07-29T09:40:00Z",
    confirmed_at: "2026-07-30T08:05:00Z",
    applied_at: null,
  },
  {
    id: 40,
    change_type: "result_calculation",
    status: "applied",
    department: null,
    new_hod: null,
    target_allocation: 163,
    target_faculty: null,
    target_student: null,
    requested_by: 231,
    requested_at: "2026-07-26T13:20:00Z",
    confirmed_at: "2026-07-26T15:00:00Z",
    applied_at: "2026-07-27T09:00:00Z",
  },
];

export const mockChangeRequests: ChangeRequest[] = loadPersisted("changeRequests", SEED_CHANGE_REQUESTS);

function saveChangeRequests(): void {
  persist("changeRequests", mockChangeRequests);
}

export const CHANGE_TYPE_LABEL: Record<ChangeRequest["change_type"], string> = {
  hod_change: "HOD change",
  faculty_delete: "Faculty deletion",
  student_delete: "Student deletion",
  result_calculation: "Result calculation",
};

export function changeRequestHeadline(cr: ChangeRequest): string {
  const label = CHANGE_TYPE_LABEL[cr.change_type];
  switch (cr.change_type) {
    case "hod_change":
      return `${label} requested: ${cr.department ?? "department"}`;
    case "faculty_delete":
      return `${label} requested: ${cr.target_faculty ?? "faculty member"}`;
    case "student_delete":
      return `${label} requested: ${cr.target_student ?? "student"}`;
    case "result_calculation":
      return `${label} requested: allocation #${cr.target_allocation ?? "—"}`;
  }
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 0)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function getChangeRequestById(id: number): ChangeRequest | undefined {
  return mockChangeRequests.find((cr) => cr.id === id);
}

/** Stand-in for the ChangeRequest.objects.create(...) calls scattered across AdminModule —
 * destroy_mixin() for faculty_delete/student_delete, DepartmentSerializer.update() for
 * hod_change. Every one of these starts life as status='pending' with confirmed_at/applied_at
 * unset; the id scheme here (max existing + 1) is just for the mock, not a real sequence. */
export function createChangeRequest(
  input: Pick<ChangeRequest, "change_type" | "department" | "new_hod" | "target_allocation" | "target_faculty" | "target_student" | "requested_by">,
): ChangeRequest {
  const nextId = mockChangeRequests.reduce((max, cr) => Math.max(max, cr.id), 0) + 1;
  const request: ChangeRequest = {
    id: nextId,
    status: "pending",
    requested_at: new Date().toISOString(),
    confirmed_at: null,
    applied_at: null,
    ...input,
  };
  mockChangeRequests.push(request);
  saveChangeRequests();
  return request;
}

/** Stand-in for ChangeRequestSerializer.update()'s status=='confirmed' branch. For result_calculation
 * specifically, confirming is as far as Admin's own action goes — Admin doesn't hold the grading
 * data needed to actually compute a result, so there's no "Apply" for Admin to do on this type;
 * the Faculty member who owns the allocation applies it themselves once it's confirmed (see
 * applyResultCalculation in data/facultyAllocationDetail.ts, invoked from their own request page). */
export function markChangeRequestConfirmed(id: number): ChangeRequest | undefined {
  const request = getChangeRequestById(id);
  if (!request) return undefined;
  request.status = "confirmed";
  request.confirmed_at = new Date().toISOString();
  saveChangeRequests();
  return request;
}

/** Stand-in for ChangeRequestSerializer.update()'s status=='applied' branch — status/applied_at
 * transition only; type-specific side effects (actually setting Department.HOD, actually deleting
 * the Faculty/Student) are dispatched by the caller (ChangeRequestDetailPage), matching how that
 * serializer method inlines each change_type's effect right where it flips the status. */
export function markChangeRequestApplied(id: number): ChangeRequest | undefined {
  const request = getChangeRequestById(id);
  if (!request) return undefined;
  request.status = "applied";
  request.applied_at = new Date().toISOString();
  saveChangeRequests();
  return request;
}

/** Stand-in for ChangeRequestSerializer.update()'s status=='declined' branch — declined also
 * stamps applied_at in the real serializer (not a typo — that's the field the model reuses to
 * mean "resolved at"), so this mirrors that exactly. */
export function markChangeRequestDeclined(id: number): ChangeRequest | undefined {
  const request = getChangeRequestById(id);
  if (!request) return undefined;
  request.status = "declined";
  request.applied_at = new Date().toISOString();
  saveChangeRequests();
  return request;
}
