import type { HeatmapCell } from "../components/charts/HeatmapGrid";
import { mockClasses, classLabel } from "./classDirectory";
import { sessionLabelForSemester } from "./allocationDirectory";

const STATUS_HEX: Record<string, string> = {
  Inactive: "#c1602a",
  Active: "#3f8a5c",
  Completed: "#b23b3b",
};

/**
 * Curriculum-progress grid: one row per class, one column per semester number — cell color is the
 * semester's real status (the same three colors Tag/SEMESTER_STATUS_TONE already use elsewhere),
 * cell label is how many courses are actually assigned. Lets an admin see, across every class at
 * once, which semesters still need a scheme built out — not a magnitude comparison, so no bar/pie
 * involved, just status-by-position.
 */
export function selectClassSchemeHeatmap(): { rowLabels: string[]; columnLabels: string[]; cells: HeatmapCell[][] } {
  const maxSemesters = Math.max(...mockClasses.map((c) => c.scheme_of_studies?.length ?? 0), 1);
  const columnLabels = Array.from({ length: maxSemesters }, (_, i) => `S${i + 1}`);

  const cells = mockClasses.map((c) => {
    const semesters = c.scheme_of_studies ?? [];
    return columnLabels.map((_, i) => {
      const semester = semesters[i];
      if (!semester) {
        return { label: "", color: "var(--color-surface-sunken)", tooltip: `${classLabel(c)} · Semester ${i + 1}: not scaffolded` };
      }
      const courseCount = semester.semesterdetails_set.filter((d) => d.course !== null).length;
      return {
        label: courseCount > 0 ? String(courseCount) : "",
        color: `color-mix(in srgb, ${STATUS_HEX[semester.status] ?? "#8a8071"} ${courseCount > 0 ? 78 : 30}%, var(--color-surface))`,
        textColor: courseCount > 0 ? "var(--color-on-accent)" : "var(--color-ink)",
        tooltip: `${classLabel(c)} · Semester ${semester.semester_no}: ${semester.status}, ${courseCount} course${courseCount === 1 ? "" : "s"}, ${sessionLabelForSemester(semester.session)}`,
        href: `/admin/semesters/${semester.semester_id}`,
      };
    });
  });

  return { rowLabels: mockClasses.map((c) => classLabel(c)), columnLabels, cells };
}
