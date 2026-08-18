/**
 * NexusAPI has no single "current semester" — Semester.status can be Active on
 * several concurrent records at once (see Models/models.py::Semester), so a
 * single status/countdown pill can't be built from it honestly. `session` is a
 * free-text term label shared across the currently-active Semester and
 * CourseAllocation records (e.g. "Fall2026"); there's no dedicated endpoint for
 * it yet, so this stands in until a real one exists (or it's derived client-side
 * from GET /api/admin/semesters/).
 */
export const mockCurrentSession = "Fall 2026";
