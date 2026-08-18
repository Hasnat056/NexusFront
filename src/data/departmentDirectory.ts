import type { AdminDepartment, ChangeRequest } from "../types/api";
import type { CategorySlice, DepartmentListRow, StatMetric, StatStripItem } from "../types/dashboard";
import { getFacultyById, mockFacultyDirectory } from "./facultyDirectory";
import { createChangeRequest, mockChangeRequests } from "./changeRequests";
import { mockAdminDashboardResponse } from "./adminDashboard";

/**
 * Stand-in for GET /api/admin/departments/ — DepartmentListAPIView has no filter_backends and no
 * create; DepartmentRetrieveUpdateAPIView has no destroy. See types/api.ts::AdminDepartment for
 * the full permission/writability breakdown. Same 6 department_ids as data/adminDashboard.ts's
 * departments_data and data/academicStructure.ts's DEPARTMENTS, kept in sync by hand since each
 * file models a different real endpoint's response shape.
 */
export const mockDepartments: AdminDepartment[] = [
  {
    urls: "/api/admin/departments/CS/",
    department_id: "CS",
    department_name: "Computer Science",
    department_inauguration_date: "2005-09-01",
    HOD: "NUM-CS-2019-008",
  },
  {
    urls: "/api/admin/departments/EE/",
    department_id: "EE",
    department_name: "Electrical Engineering",
    department_inauguration_date: "2008-09-01",
    HOD: "NUM-EE-2021-014",
  },
  {
    urls: "/api/admin/departments/MATH/",
    department_id: "MATH",
    department_name: "Mathematics",
    department_inauguration_date: "2003-09-01",
    HOD: "NUM-MATH-2016-002",
  },
  {
    urls: "/api/admin/departments/BIO/",
    department_id: "BIO",
    department_name: "Biosciences",
    department_inauguration_date: "2011-09-01",
    HOD: "NUM-MATH-2016-002",
  },
  {
    urls: "/api/admin/departments/BUS/",
    department_id: "BUS",
    department_name: "Business",
    department_inauguration_date: "2009-09-01",
    HOD: null,
  },
  {
    urls: "/api/admin/departments/PHYS/",
    department_id: "PHYS",
    department_name: "Physics",
    department_inauguration_date: "2003-09-01",
    HOD: null,
  },
];

function hodName(hod: string | null): string {
  if (!hod) return "Unassigned";
  const faculty = getFacultyById(hod);
  return faculty ? `${faculty.person.first_name} ${faculty.person.last_name}` : hod;
}

export function selectDepartmentListRows(departments: AdminDepartment[]): DepartmentListRow[] {
  return departments.map((d) => ({
    departmentId: d.department_id,
    departmentName: d.department_name,
    inaugurationDate: d.department_inauguration_date,
    hodName: hodName(d.HOD),
    detailHref: `/admin/departments/${d.department_id}`,
  }));
}

export function getDepartmentById(departmentId: string): AdminDepartment | undefined {
  return mockDepartments.find((d) => d.department_id === departmentId);
}

/** Faculty eligible to be picked as HOD in the edit form — DepartmentSerializer doesn't restrict
 * the HOD queryset by department, so every faculty member is a valid option, not just this
 * department's own. */
export function hodOptions(): { value: string; label: string }[] {
  return mockFacultyDirectory.map((f) => ({
    value: f.person.person_id,
    label: `${f.person.first_name} ${f.person.last_name} — ${f.person.person_id}`,
  }));
}

/** The actual field mutation — only ever called once a hod_change ChangeRequest is applied
 * (ChangeRequestSerializer.update()'s hod_change branch does `department.HOD = instance.new_hod;
 * department.save()`). Never call this directly from the edit form; PUT never writes HOD itself. */
export function setDepartmentHod(departmentId: string, hod: string | null): AdminDepartment | undefined {
  const department = getDepartmentById(departmentId);
  if (!department) return undefined;
  department.HOD = hod;
  return department;
}

/** Stand-in for PUT /api/admin/departments/<department_id>/ with a HOD value —
 * DepartmentSerializer.update() pops HOD out of validated_data and creates a pending
 * ChangeRequest(change_type='hod_change') instead of writing the field; a no-op (matching
 * `if instance.HOD and instance.HOD == faculty: return instance`) if the picked faculty is
 * already the HOD. The field itself doesn't change until that request is later applied. */
export function requestHodChange(departmentId: string, newHod: string | null): { message: string; created: boolean } {
  const department = getDepartmentById(departmentId);
  if (!department) return { message: "Department not found.", created: false };
  if (!newHod) return { message: "Choose a faculty member first.", created: false };
  if (department.HOD === newHod) return { message: "That faculty member is already the HOD.", created: false };

  createChangeRequest({
    change_type: "hod_change",
    department: departmentId,
    new_hod: newHod,
    target_allocation: null,
    target_faculty: null,
    target_student: null,
    requested_by: 1,
  });

  return { message: "HOD change request submitted — a confirmation email has been sent. The HOD won't change until it's confirmed and applied.", created: true };
}

/** For the department detail page's "pending change" banner — mirrors what an admin would see by
 * filtering GET /api/admin/requests/?department=<id>&change_type=hod_change themselves. */
export function getActiveHodChangeRequest(departmentId: string): ChangeRequest | undefined {
  return mockChangeRequests.find(
    (cr) => cr.change_type === "hod_change" && cr.department === departmentId && cr.status !== "applied" && cr.status !== "declined" && cr.status !== "expired",
  );
}

/** Per-department stat strip for the detail page header — same departments_data join as
 * selectDepartmentStatMetrics above, just scoped to one department instead of summed across all. */
export function selectDepartmentDetailStats(departmentId: string): StatStripItem[] {
  const deptData = mockAdminDashboardResponse.departments_data.find((d) => d.department_id === departmentId);
  return [
    { value: deptData?.student_count ?? 0, label: "Students" },
    { value: deptData?.faculty_count ?? 0, label: "Faculty" },
    { value: deptData?.program_count ?? 0, label: "Programs" },
  ];
}

/**
 * Stat strip for the top of the department list page. Combines this file's mockDepartments (HOD
 * assignment — the real DepartmentSerializer's own field) with AdminDashboardResponse.
 * departments_data (student_count/faculty_count/program_count per department, from GET
 * /api/admin/dashboard/) — two different real endpoints describing overlapping department data,
 * joined here purely for a richer header, not fabricated numbers.
 */
export function selectDepartmentStatMetrics(departments: AdminDepartment[]): StatMetric[] {
  const withHod = departments.filter((d) => d.HOD).length;
  const deptData = mockAdminDashboardResponse.departments_data;
  const totalFaculty = deptData.reduce((sum, d) => sum + d.faculty_count, 0);
  const totalStudents = deptData.reduce((sum, d) => sum + d.student_count, 0);

  return [
    { id: "departments", label: "Departments", value: departments.length.toLocaleString("en-US") },
    { id: "hod-assigned", label: "HOD assigned", value: `${withHod} of ${departments.length}` },
    { id: "faculty", label: "Faculty", value: totalFaculty.toLocaleString("en-US") },
    { id: "students", label: "Students", value: totalStudents.toLocaleString("en-US") },
  ];
}

// Okabe-Ito palette — colorblind-safe categorical colors, distinct enough for 6 slices at once.
export const DEPARTMENT_COLORS: Record<string, string> = {
  CS: "#0072B2",
  EE: "#E69F00",
  MATH: "#009E73",
  BIO: "#D55E00",
  BUS: "#56B4E9",
  PHYS: "#CC79A7",
};

/** Student distribution across departments, from the same departments_data used by the Admin
 * dashboard's own stat tiles — reused here as a pie instead of a table. */
export function selectDepartmentStudentSlices(): CategorySlice[] {
  return mockAdminDashboardResponse.departments_data.map((d) => ({
    id: d.department_id,
    label: d.department_id,
    value: d.student_count,
    color: DEPARTMENT_COLORS[d.department_id] ?? "#9a9690",
  }));
}

/** Faculty distribution across departments — same departments_data, faculty_count instead of
 * student_count, paired alongside the student pie for a side-by-side comparison. */
export function selectDepartmentFacultySlices(): CategorySlice[] {
  return mockAdminDashboardResponse.departments_data.map((d) => ({
    id: d.department_id,
    label: d.department_id,
    value: d.faculty_count,
    color: DEPARTMENT_COLORS[d.department_id] ?? "#9a9690",
  }));
}
