import type { AdminClass, AdminSemester, AdminSession } from "../types/api";

export interface SemesterChoice {
  semesterId: number;
  label: string;
  courseCodes: string[];
}

function classLabel(cls: Pick<AdminClass, "program" | "batch_year">): string {
  return `${cls.program}-${cls.batch_year ?? "?"}`;
}

/** Course codes assigned to a semester, cross-referenced through its class's embedded
 * scheme_of_studies — AdminSemester itself doesn't carry semesterdetails_set. */
function courseCodesForSemester(semesterId: number, classes: AdminClass[]): string[] {
  for (const c of classes) {
    const entry = c.scheme_of_studies?.find((s) => s.semester_id === semesterId);
    if (entry) return entry.semesterdetails_set.map((d) => d.course).filter((code): code is string => code !== null);
  }
  return [];
}

/** Client-side approximation of CourseAllocationSerializer.get_fields()'s writable `semester`
 * queryset: status=='Inactive' and session assigned to a session that's itself 'Initiated'.
 * Semesters no longer carry their own activation deadline — that lives on the session and
 * cascades down. This only shapes which options show up in the dropdown — the backend
 * re-validates on submit regardless, so drift here is a UX rough edge at worst, not a
 * correctness gap. */
export function eligibleSemestersForAllocation(
  semesters: AdminSemester[],
  sessions: AdminSession[],
  classes: AdminClass[],
): SemesterChoice[] {
  return semesters
    .filter((s) => {
      if (s.status !== "Inactive" || s.session === null) return false;
      return sessions.find((session) => session.id === s.session)?.status === "Initiated";
    })
    .map((s) => ({
      semesterId: s.semester_id,
      label: `${s.associated_class} · Semester ${s.semester_no}`,
      courseCodes: courseCodesForSemester(s.semester_id, classes),
    }));
}

export function semesterChoice(semesterId: number, semesters: AdminSemester[], classes: AdminClass[]): SemesterChoice | undefined {
  const s = semesters.find((sem) => sem.semester_id === semesterId);
  if (!s) return undefined;
  return {
    semesterId: s.semester_id,
    label: `${s.associated_class} · Semester ${s.semester_no}`,
    courseCodes: courseCodesForSemester(s.semester_id, classes),
  };
}

export { classLabel };
