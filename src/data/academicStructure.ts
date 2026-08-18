/**
 * Reference lists for the Faculty/Student directory forms' dropdowns. Shaped like
 * Department/Program/Class (Models/models.py) — department_id/program_id are the real
 * primary keys (CourseAllocation.department etc. are FKs to these bare strings), class
 * label mirrors Class.__str__ ("{program_id}-{batch_year}"). Same department set as
 * data/adminDashboard.ts's departments_data, duplicated here since that file is
 * dashboard-response-shaped and these are just directory form inputs, not API data.
 */
export interface DepartmentRef {
  department_id: string;
  department_name: string;
}

export interface ProgramRef {
  program_id: string;
  program_name: string;
  department: string;
}

export interface ClassRef {
  class_id: number;
  program: string;
  batch_year: number;
}

export const DEPARTMENTS: DepartmentRef[] = [
  { department_id: "CS", department_name: "Computer Science" },
  { department_id: "EE", department_name: "Electrical Engineering" },
  { department_id: "MATH", department_name: "Mathematics" },
  { department_id: "BIO", department_name: "Biosciences" },
  { department_id: "BUS", department_name: "Business" },
  { department_id: "PHYS", department_name: "Physics" },
];

export const PROGRAMS: ProgramRef[] = [
  { program_id: "CS-BS", program_name: "BS Computer Science", department: "CS" },
  { program_id: "SE-BS", program_name: "BS Software Engineering", department: "CS" },
  { program_id: "EE-BS", program_name: "BS Electrical Engineering", department: "EE" },
  { program_id: "MATH-BS", program_name: "BS Mathematics", department: "MATH" },
  { program_id: "BIO-BS", program_name: "BS Biosciences", department: "BIO" },
  { program_id: "BBA", program_name: "Bachelor of Business Administration", department: "BUS" },
];

export const CLASSES: ClassRef[] = [
  { class_id: 1, program: "CS-BS", batch_year: 2023 },
  { class_id: 2, program: "CS-BS", batch_year: 2024 },
  { class_id: 3, program: "SE-BS", batch_year: 2023 },
  { class_id: 4, program: "EE-BS", batch_year: 2024 },
  { class_id: 5, program: "MATH-BS", batch_year: 2023 },
  { class_id: 6, program: "BBA", batch_year: 2024 },
];

export function classLabel(classId: number): string {
  const cls = CLASSES.find((c) => c.class_id === classId);
  return cls ? `${cls.program}-${cls.batch_year}` : `#${classId}`;
}
