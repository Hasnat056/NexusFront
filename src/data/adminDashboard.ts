import type { AdminDashboardResponse } from "../types/api";
import type { CategorySlice, DepartmentRow, StatMetric, TrendPoint } from "../types/dashboard";

/**
 * Shaped exactly like GET /api/admin/dashboard/ (see AdminModule/views.py::AdminDashboardAPIView
 * in the NexusAPI repo). Stand-in until real fetching + auth is wired up — the point is that every
 * field below is one the backend actually returns, nothing invented for the UI's convenience.
 */
export const mockAdminDashboardResponse: AdminDashboardResponse = {
  admin: {
    admin_id: "NUM-ADM-2022-01",
    first_name: "Renata",
    last_name: "Hays",
    institutional_email: "r.hays@nexus.edu",
    image: null,
  },
  students_total: 2540,
  faculty_total: 128,
  programs_total: 14,
  courses_total: 96,
  classes_total: 22,
  allocation_total: 84,
  enrollment_total: 4910,
  students_status_count: [
    { status: "Active", count: 2312 },
    { status: "On Probation", count: 94 },
    { status: "Frozen", count: 51 },
    { status: "Dropped", count: 38 },
    { status: "Graduated", count: 45 },
  ],
  allocations_status_count: [
    { status: "Ongoing", count: 61 },
    { status: "Inactive", count: 14 },
    { status: "Completed", count: 7 },
    { status: "Cancelled", count: 2 },
  ],
  enrollments_status_count: [
    { status: "Active", count: 3218 },
    { status: "Completed", count: 1390 },
    { status: "Dropped", count: 224 },
    { status: "Inactive", count: 78 },
  ],
  classes_student_count: [
    { class_id: 1, count: 118 },
    { class_id: 2, count: 124 },
    { class_id: 3, count: 109 },
  ],
  departments_data: [
    { department_id: "CS", student_count: 812, faculty_count: 34, program_count: 3 },
    { department_id: "EE", student_count: 470, faculty_count: 22, program_count: 2 },
    { department_id: "MATH", student_count: 356, faculty_count: 18, program_count: 2 },
    { department_id: "BIO", student_count: 298, faculty_count: 16, program_count: 2 },
    { department_id: "BUS", student_count: 341, faculty_count: 19, program_count: 3 },
    { department_id: "PHYS", student_count: 263, faculty_count: 19, program_count: 2 },
  ],
  enrollment_yearly: [
    { year: 2021, count: 1240 },
    { year: 2022, count: 1980 },
    { year: 2023, count: 2860 },
    { year: 2024, count: 3620 },
    { year: 2025, count: 4310 },
    { year: 2026, count: 4910 },
  ],
  yearly_admission: [
    { "program_id__department_id__department_name": "Computer Science", year: 2026, count: 210 },
    { "program_id__department_id__department_name": "Electrical Engineering", year: 2026, count: 128 },
  ],
};

function statusCountsToBreakdown(
  counts: { status: string; count: number }[],
  toneByStatus: Record<string, "good" | "warning" | "critical" | "flat">,
) {
  return counts.map((c) => ({ label: c.status, count: c.count, tone: toneByStatus[c.status] ?? "flat" }));
}

export function selectStatMetrics(data: AdminDashboardResponse): StatMetric[] {
  return [
    {
      id: "students",
      label: "Students",
      value: data.students_total.toLocaleString("en-US"),
      breakdown: statusCountsToBreakdown(data.students_status_count, {
        Active: "good",
        Graduated: "good",
        "On Probation": "warning",
        Frozen: "warning",
        Dropped: "critical",
      }),
    },
    {
      id: "faculty",
      label: "Faculty",
      value: data.faculty_total.toLocaleString("en-US"),
    },
    {
      id: "allocations",
      label: "Course allocations",
      value: data.allocation_total.toLocaleString("en-US"),
      breakdown: statusCountsToBreakdown(data.allocations_status_count, {
        Ongoing: "good",
        Completed: "flat",
        Inactive: "flat",
        Cancelled: "critical",
      }),
    },
    {
      id: "departments",
      label: "Departments",
      value: data.departments_data.length.toLocaleString("en-US"),
    },
  ];
}

export function selectDepartmentRows(data: AdminDashboardResponse): DepartmentRow[] {
  return data.departments_data.map((d) => ({
    departmentId: d.department_id,
    studentCount: d.student_count,
    facultyCount: d.faculty_count,
    programCount: d.program_count,
  }));
}

export function selectEnrollmentTrend(data: AdminDashboardResponse): TrendPoint[] {
  return data.enrollment_yearly
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((row) => ({
      label: String(row.year),
      value: row.count,
      tooltip: `${row.year}: ${row.count.toLocaleString("en-US")} enrollments`,
    }));
}

// Validated all-pairs-safe (blue/orange/aqua + neutral gray) — see scripts/validate_palette.js
// in the dataviz skill. A pie shows every wedge at once, so this needs the stricter check.
const ENROLLMENT_STATUS_COLOR: Record<string, string> = {
  Active: "#2a78d6",
  Completed: "#1baf7a",
  Dropped: "#eb6834",
  Inactive: "#9a9690",
};

export function selectEnrollmentStatusSlices(data: AdminDashboardResponse): CategorySlice[] {
  return data.enrollments_status_count.map((row) => ({
    id: row.status,
    label: row.status,
    value: row.count,
    color: ENROLLMENT_STATUS_COLOR[row.status] ?? "#9a9690",
  }));
}
