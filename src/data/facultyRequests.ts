import type { ChangeRequestType, FacultyChangeRequest } from "../types/api";

const CHANGE_TYPE_LABEL: Record<ChangeRequestType, string> = {
  hod_change: "HOD change",
  faculty_delete: "Faculty deletion",
  student_delete: "Student deletion",
  result_calculation: "Result calculation",
};

/** FacultyRequestsSerializer has no `id` field — only `urls`, which embeds the pk as its last path
 * segment. This is the only way to recover the id for routing to /faculty/requests/<id>. */
export function extractIdFromUrl(url: string): string {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? match[1] : url;
}

export function facultyRequestHeadline(request: FacultyChangeRequest): string {
  const label = CHANGE_TYPE_LABEL[request.change_type];
  return request.target_allocation !== null ? `${label} — allocation #${request.target_allocation}` : label;
}
