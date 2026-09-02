export type BulkTargetType = "faculty" | "student";

export interface BulkRowError {
  data_entry: Record<string, string>;
  /** DRF's `serializer.errors` shape — usually {field: [messages]}, but a row that fails on a
   * writable nested field (e.g. person.contact_number) comes back as {person: {contact_number:
   * [messages]}} instead, so this isn't flat. */
  errors: Record<string, unknown>;
}

/** Flattens a (possibly nested) DRF error object into "dotted.path: message" lines. */
export function flattenFieldErrors(errors: Record<string, unknown>, prefix = ""): { path: string; message: string }[] {
  const lines: { path: string; message: string }[] = [];
  for (const [key, value] of Object.entries(errors)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      lines.push({ path, message: value.filter((v) => typeof v === "string").join(" ") });
    } else if (value && typeof value === "object") {
      lines.push(...flattenFieldErrors(value as Record<string, unknown>, path));
    } else if (typeof value === "string") {
      lines.push({ path, message: value });
    }
  }
  return lines;
}

/** Response shape of POST /api/admin/bulk/?type=faculty|student (AdminModule/serializers.py::
 * FacultyStudentBulkSerializer.create()) — synchronous, no Celery/task polling. Each CSV row is
 * run through FacultySerializer/StudentSerializer independently; one row failing doesn't stop
 * the rest, so a 201 can still carry a non-empty `errors` list. */
export interface BulkCreateResult {
  row_count: number;
  insert_count: number;
  error_row_count: number;
  errors: BulkRowError[];
}
