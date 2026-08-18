import type { ProgramPoint } from "../components/charts/ProgramFeeSwarm";
import { DEPARTMENT_COLORS } from "./departmentDirectory";
import { mockPrograms } from "./programDirectory";
import { mockStudentDirectory } from "./studentDirectory";

/** Enrolled-student counts per program aren't tracked anywhere else in this app — Program only
 * carries its own fields (fee, total_semesters), and the admin dashboard's counts are per
 * department, not per program. Derived here straight from studentDirectory.ts's `program` field. */
export function selectProgramPoints(): ProgramPoint[] {
  return mockPrograms.map((p) => ({
    programId: p.program_id,
    programName: p.program_name,
    department: p.department,
    color: DEPARTMENT_COLORS[p.department] ?? "#9a9690",
    studentCount: mockStudentDirectory.filter((s) => s.program === p.program_id).length,
    feePerSemester: p.fee_per_semester ?? 0,
    totalSemesters: p.total_semesters,
    detailHref: `/admin/programs/${p.program_id}`,
  }));
}
