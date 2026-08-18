import type { FacultyDashboardResponse } from "../types/api";

/**
 * Shaped like GET /api/faculty/dashboard/ (FacultyModule/views.py::FacultyDashboardView).
 * allocation_average_success isn't rendered yet — it has no course-name mapping
 * (keyed only by allocation_id), waiting on a chart treatment.
 */
export const mockFacultyDashboardResponse: FacultyDashboardResponse = {
  faculty: {
    employee_id: "NUM-FAC-2019-231",
    image: null,
    first_name: "Marcus",
    last_name: "Webb",
    institutional_email: "m.webb@nexus.edu",
  },
  course_allocation_count: 6,
  active_allocations: 3,
  completed_allocations: 3,
  allocation_average_success: {
    "118": 81.9,
    "97": 68.2,
    "84": 74.0,
  },
};
