import { createChangeRequest, formatRelativeTime, markChangeRequestApplied, mockChangeRequests } from "./changeRequests";
import type { ChangeRequest, ChangeRequestStatus, ChangeRequestType, FacultyChangeRequest } from "../types/api";

/** Marcus Webb's numeric requested_by id — the mock's stand-in for whatever internal user pk the
 * real backend resolves from the authenticated Faculty's session. Matches the "231" suffix of his
 * employee_id (NUM-FAC-2019-231) purely for readability here, not a claim about how the real
 * backend derives that pk. */
const FACULTY_REQUESTER_ID = 231;

function toFacultyChangeRequest(cr: ChangeRequest): FacultyChangeRequest {
  return {
    urls: `http://localhost:8000/api/faculty/requests/${cr.id}/`,
    change_type: cr.change_type,
    status: cr.status,
    target_allocation: cr.target_allocation,
    requested_by: cr.requested_by,
    requested_at: cr.requested_at,
    confirmed_at: cr.confirmed_at,
    applied_at: cr.applied_at,
  };
}

/**
 * Faculty's own request tracker (GET /api/faculty/requests/) isn't a separate store — it's the
 * SAME rows Admin's queue reads (data/changeRequests.ts's mockChangeRequests), narrowed to this
 * faculty's own result_calculation requests and reshaped through FacultyRequestsSerializer's
 * slimmer field set (no id/department/new_hod/target_faculty/target_student — just urls, which
 * embeds the pk, plus the fields relevant to a status tracker). Admin confirming a request and
 * this faculty seeing it flip to "Confirmed" are the same write, exactly like the real single-table
 * backend — there's deliberately no independent Faculty-side copy to keep in sync by hand.
 */
export function getFacultyRequests(): FacultyChangeRequest[] {
  return mockChangeRequests
    .filter((cr) => cr.change_type === "result_calculation" && cr.requested_by === FACULTY_REQUESTER_ID)
    .map(toFacultyChangeRequest);
}

const CHANGE_TYPE_LABEL: Record<ChangeRequestType, string> = {
  hod_change: "HOD change",
  faculty_delete: "Faculty deletion",
  student_delete: "Student deletion",
  result_calculation: "Result calculation",
};

function extractIdFromUrl(url: string): string {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? match[1] : url;
}

/** Stand-in for the calculate-result GET action: creates a pending change request for the
 * allocation, or returns the existing one if a pending/confirmed request is already in flight
 * (the real view is idempotent this way — it never opens a second concurrent request). */
export function requestResultCalculation(allocationId: number): FacultyChangeRequest {
  const existing = mockChangeRequests.find(
    (cr) =>
      cr.change_type === "result_calculation" &&
      cr.requested_by === FACULTY_REQUESTER_ID &&
      cr.target_allocation === allocationId &&
      (cr.status === "pending" || cr.status === "confirmed"),
  );
  if (existing) return toFacultyChangeRequest(existing);
  const created = createChangeRequest({
    change_type: "result_calculation",
    target_allocation: allocationId,
    requested_by: FACULTY_REQUESTER_ID,
    department: null,
    new_hod: null,
    target_faculty: null,
    target_student: null,
  });
  return toFacultyChangeRequest(created);
}

export function getFacultyRequestByKey(key: string): FacultyChangeRequest | undefined {
  const id = Number(key);
  const cr = mockChangeRequests.find((c) => c.id === id && c.requested_by === FACULTY_REQUESTER_ID);
  return cr ? toFacultyChangeRequest(cr) : undefined;
}

export function facultyRequestHeadline(request: FacultyChangeRequest): string {
  const label = CHANGE_TYPE_LABEL[request.change_type];
  return request.target_allocation !== null ? `${label} — allocation #${request.target_allocation}` : label;
}

/** Flips a confirmed request to applied once its allocation's result calculation has actually run
 * (see applyResultCalculation in data/facultyAllocationDetail.ts, called by the caller before
 * this). Delegates the actual status/applied_at write to changeRequests.ts's
 * markChangeRequestApplied — same row Admin's queue reads, so Admin sees "Applied" immediately. */
export function markRequestApplied(requestUrl: string): void {
  const id = Number(extractIdFromUrl(requestUrl));
  markChangeRequestApplied(id);
}

export interface FacultyRequestListItem {
  key: string;
  headline: string;
  status: ChangeRequestStatus;
  relativeTime: string;
  detailHref: string;
}

export function selectFacultyRequestListItems(
  requests: FacultyChangeRequest[],
  now?: Date,
): FacultyRequestListItem[] {
  return requests.map((request) => {
    const key = extractIdFromUrl(request.urls);
    return {
      key,
      headline: facultyRequestHeadline(request),
      status: request.status,
      relativeTime: formatRelativeTime(request.requested_at, now),
      detailHref: `/faculty/requests/${key}`,
    };
  });
}
