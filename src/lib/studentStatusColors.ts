import { colorForIndex } from "./palette";
import type { StudentStatus } from "../types/api";

/** Fixed assignment order for the 5 statuses — colors must stay pinned to a status no matter
 * which programs/rows are present, never re-cycled by whichever statuses happen to show up in a
 * filtered set (dataviz color-formula rule: "color follows the entity, never its rank"). */
export const STUDENT_STATUS_ORDER: StudentStatus[] = ["Active", "Dropped", "Frozen", "Graduated", "On Probation"];

export const STUDENT_STATUS_COLOR: Record<StudentStatus, string> = Object.fromEntries(
  STUDENT_STATUS_ORDER.map((status, i) => [status, colorForIndex(i)]),
) as Record<StudentStatus, string>;
