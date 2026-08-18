import type { StudentDashboardResponse } from "../types/api";

/** Shaped like GET /api/student/dashboard/ — a flat dict, not nested under "student". */
export const mockStudentDashboardResponse: StudentDashboardResponse = {
  student_id: "NUM-STU-2023-114",
  first_name: "Lucia",
  last_name: "Ferreira",
  institutional_email: "l.ferreira@nexus.edu",
  class: "BSCS-2023",
  program: "BS Computer Science",
  department: "Computer Science",
  image: null,
  total_enrollments: 18,
  active_enrollments: 5,
  completed_enrollments: 13,
};
