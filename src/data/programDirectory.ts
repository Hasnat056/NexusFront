import type { AdminProgram } from "../types/api";
import type { ProgramListRow } from "../types/dashboard";

/**
 * Stand-in for GET /api/admin/programs/ — same program_ids as data/academicStructure.ts's
 * PROGRAMS reference list (used by Student create/edit dropdowns), kept in sync by hand since
 * that file models a lightweight reference shape and this one models the full CRUD resource.
 */
export const mockPrograms: AdminProgram[] = [
  { urls: "/api/admin/programs/CS-BS/", program_id: "CS-BS", program_name: "BS Computer Science", department: "CS", total_semesters: 8, fee_per_semester: 185000 },
  { urls: "/api/admin/programs/SE-BS/", program_id: "SE-BS", program_name: "BS Software Engineering", department: "CS", total_semesters: 8, fee_per_semester: 180000 },
  { urls: "/api/admin/programs/EE-BS/", program_id: "EE-BS", program_name: "BS Electrical Engineering", department: "EE", total_semesters: 8, fee_per_semester: 175000 },
  { urls: "/api/admin/programs/MATH-BS/", program_id: "MATH-BS", program_name: "BS Mathematics", department: "MATH", total_semesters: 8, fee_per_semester: 140000 },
  { urls: "/api/admin/programs/BIO-BS/", program_id: "BIO-BS", program_name: "BS Biosciences", department: "BIO", total_semesters: 8, fee_per_semester: 150000 },
  { urls: "/api/admin/programs/BBA/", program_id: "BBA", program_name: "Bachelor of Business Administration", department: "BUS", total_semesters: 8, fee_per_semester: 160000 },
];

export function selectProgramListRows(programs: AdminProgram[]): ProgramListRow[] {
  return programs.map((p) => ({
    programId: p.program_id,
    programName: p.program_name,
    department: p.department,
    totalSemesters: p.total_semesters,
    feePerSemester: p.fee_per_semester,
    detailHref: `/admin/programs/${p.program_id}`,
  }));
}

export function getProgramById(programId: string): AdminProgram | undefined {
  return mockPrograms.find((p) => p.program_id === programId);
}

/** Mirrors ProgramSerializer's writable shape — program_id is genuinely client-supplied here
 * (Program.program_id has no server-side generation, unlike Faculty/Student's person_id). */
export interface ProgramFormValue {
  program_id: string;
  program_name: string;
  department: string;
  total_semesters: string;
  fee_per_semester: string;
}

export function emptyProgramFormValue(): ProgramFormValue {
  return { program_id: "", program_name: "", department: "CS", total_semesters: "8", fee_per_semester: "" };
}

export function programFormValueFromRecord(record: AdminProgram): ProgramFormValue {
  return {
    program_id: record.program_id,
    program_name: record.program_name,
    department: record.department,
    total_semesters: String(record.total_semesters),
    fee_per_semester: record.fee_per_semester ? String(record.fee_per_semester) : "",
  };
}

/** Stand-in for POST /api/admin/programs/ — mutates the in-memory mock array. */
export function createProgram(input: ProgramFormValue): AdminProgram {
  const record: AdminProgram = {
    urls: `/api/admin/programs/${input.program_id}/`,
    program_id: input.program_id,
    program_name: input.program_name,
    department: input.department,
    total_semesters: Number(input.total_semesters) || 8,
    fee_per_semester: input.fee_per_semester ? Number(input.fee_per_semester) : null,
  };
  mockPrograms.push(record);
  return record;
}

/** Stand-in for PUT/PATCH /api/admin/programs/<program_id>/ — plain field-by-field update, no
 * ChangeRequest gate (ProgramSerializer has no custom update()). */
export function updateProgram(programId: string, input: ProgramFormValue): AdminProgram | undefined {
  const record = getProgramById(programId);
  if (!record) return undefined;
  record.program_name = input.program_name;
  record.department = input.department;
  record.total_semesters = Number(input.total_semesters) || 8;
  record.fee_per_semester = input.fee_per_semester ? Number(input.fee_per_semester) : null;
  return record;
}

/** Stand-in for DELETE /api/admin/programs/<program_id>/ — ProgramRetrieveUpdateDestroyAPIView.
 * perform_destroy() calls instance.delete() directly: a real, synchronous, unconfirmed delete —
 * no ChangeRequest, no confirmation email, unlike Faculty/Student/Department deletion paths. */
export function deleteProgram(programId: string): boolean {
  const index = mockPrograms.findIndex((p) => p.program_id === programId);
  if (index === -1) return false;
  mockPrograms.splice(index, 1);
  return true;
}

/** For the Department detail page's programs list — mirrors GET /api/admin/programs/
 * ?department=<id> (ProgramListCreateAPIView.filterset_fields includes 'department'). */
export function getProgramsByDepartment(departmentId: string): AdminProgram[] {
  return mockPrograms.filter((p) => p.department === departmentId);
}
