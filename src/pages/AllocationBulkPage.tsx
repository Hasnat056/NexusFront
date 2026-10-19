import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { Select } from "../components/ui/Select";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import { apiGet, apiGetAllPages, apiMutate, cached, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage, apiFieldErrors } from "../lib/api";
import type {
  AdminAllocationBulkCourse,
  AdminAllocationBulkResponse,
  AdminAllocationBulkResult,
  AdminAllocationBulkRow,
  AdminFacultyListItem,
  SessionStatus,
} from "../types/api";
import type { StatusTone } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";
import styles from "./AllocationBulkPage.module.css";

const SESSION_STATUS_TONE: Record<SessionStatus, StatusTone> = {
  Inactive: "neutral",
  Initiated: "warning",
  Available: "info",
  Active: "good",
  Completed: "critical",
};

function assignmentKey(semesterId: number, courseCode: string): string {
  return `${semesterId}:${courseCode}`;
}

/** Splits the bulk endpoint's two error shapes: a whole-request rejection (wrong/mixed session,
 * unbound semesters) lands under `non_field_errors`; a per-row rejection (duplicate row, course not
 * in scheme) lands under that row's own index into the submitted array. `keys` is the same-order
 * list of assignment keys the payload was built from, so a numeric index maps straight back to the
 * cell that produced it. */
function splitBulkErrors(err: unknown, keys: string[]): { banner: string | null; cellErrors: Record<string, string> } {
  const fields = apiFieldErrors(err);
  if (Object.keys(fields).length === 0) {
    return { banner: apiErrorMessage(err), cellErrors: {} };
  }
  const cellErrors: Record<string, string> = {};
  let banner: string | null = null;
  for (const [key, message] of Object.entries(fields)) {
    if (key === "non_field_errors") {
      banner = message;
      continue;
    }
    const index = Number(key);
    const cellKey = Number.isInteger(index) ? keys[index] : undefined;
    if (cellKey) {
      cellErrors[cellKey] = message;
    } else if (!banner) {
      banner = message;
    }
  }
  return { banner, cellErrors };
}

export function AllocationBulkPage() {
  useAdminPageConfig("Bulk allocate");
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState<AdminAllocationBulkResponse | null>(null);
  const [faculty, setFaculty] = useState<AdminFacultyListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<AdminAllocationBulkResponse>("/admin/allocations/bulk/"),
      cached("admin:all-faculty", () => apiGetAllPages<AdminFacultyListItem>("/admin/faculty/")),
    ])
      .then(([bulkRes, facultyRes]) => {
        if (cancelled) return;
        setData(bulkRes);
        setFaculty(facultyRes);
        setCellErrors({});
        const seeded: Record<string, string> = {};
        for (const cls of bulkRes.classes) {
          for (const course of cls.courses) {
            seeded[assignmentKey(cls.semester_id, course.course_code)] = course.faculty?.employee_id ?? "";
          }
        }
        setAssignments(seeded);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setLoadError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, refreshKey]);

  const facultyOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...faculty.map((f) => ({
        value: f.person.person_id,
        label: `${f.person.person_id} · ${f.person.first_name} ${f.person.last_name}`,
      })),
    ],
    [faculty],
  );

  const session = data?.session ?? null;
  const readOnly = session !== null && session.status !== "Initiated";
  const totalCourses = data ? data.classes.reduce((sum, c) => sum + c.courses.length, 0) : 0;
  const assignedCourses = data
    ? data.classes.reduce(
        (sum, c) => sum + c.courses.filter((course) => assignments[assignmentKey(c.semester_id, course.course_code)]).length,
        0,
      )
    : 0;

  async function handleSave() {
    if (!data) return;
    setBanner(null);
    setCellErrors({});
    setSaving(true);
    const rows: AdminAllocationBulkRow[] = [];
    const keys: string[] = [];
    for (const cls of data.classes) {
      for (const course of cls.courses) {
        const key = assignmentKey(cls.semester_id, course.course_code);
        const facultyId = assignments[key];
        if (facultyId) {
          rows.push({ semester: cls.semester_id, course: course.course_code, faculty: facultyId });
          keys.push(key);
        }
      }
    }
    try {
      const result = await apiMutate<AdminAllocationBulkResult>("/admin/allocations/bulk/", "POST", rows);
      invalidateCache("admin:allocations");
      showToast(`Allocations saved: ${result.created} created, ${result.updated} updated.`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      const split = splitBulkErrors(err, keys);
      setBanner(split.banner);
      setCellErrors(split.cellErrors);
    } finally {
      setSaving(false);
    }
  }

  function courseColumns(semesterId: number): Column<AdminAllocationBulkCourse>[] {
    return [
      {
        key: "course",
        header: "Course",
        width: "45%",
        render: (course) => (
          <>
            <strong>{course.course_code}</strong> · {course.course_name}
          </>
        ),
      },
      { key: "credits", header: "Credit hours", align: "right", width: "20%", render: (course) => course.credit_hours },
      {
        key: "faculty",
        header: "Faculty",
        width: "35%",
        render: (course) => {
          const key = assignmentKey(semesterId, course.course_code);
          return (
            <div className={styles.facultyCell}>
              <Select
                ariaLabel={`Faculty for ${course.course_code}`}
                value={assignments[key] ?? ""}
                onChange={(next) => setAssignments((prev) => ({ ...prev, [key]: next }))}
                placeholder="Unassigned"
                disabled={readOnly}
                invalid={Boolean(cellErrors[key])}
                options={facultyOptions}
              />
              {cellErrors[key] && <span className={formStyles.fieldError}>{cellErrors[key]}</span>}
            </div>
          );
        },
      },
    ];
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Allocations", href: "/admin/allocations" },
          { label: "Bulk allocate" },
        ]}
      />

      {loadError && <div className={formStyles.errorBanner}>{loadError}</div>}
      {banner && <div className={formStyles.errorBanner}>{banner}</div>}

      {!data ? (
        <p className={detailStyles.empty}>Loading worksheet…</p>
      ) : session === null ? (
        <p className={formStyles.hint}>
          No session is currently open for allocation. Set an activation deadline on a session first.
        </p>
      ) : (
        <>
          <div className={detailStyles.profileCard}>
            <div className={detailStyles.profileMain}>
              <h1 className={detailStyles.name}>
                {session.period} {session.year}
              </h1>
              <p className={detailStyles.subline}>
                {assignedCourses} of {totalCourses} courses assigned
              </p>
            </div>
            <Tag tone={SESSION_STATUS_TONE[session.status]}>{session.status}</Tag>
          </div>

          {readOnly && (
            <p className={formStyles.hint}>
              Read-only. The worksheet closes once the session leaves Initiated — reassign a single
              course from that allocation's own page instead.
            </p>
          )}

          {data.classes.length === 0 ? (
            <p className={formStyles.hint}>No semester is bound to this session yet.</p>
          ) : (
            data.classes.map((cls) => {
              const assignedInClass = cls.courses.filter(
                (course) => assignments[assignmentKey(cls.semester_id, course.course_code)],
              ).length;
              return (
                <Panel
                  key={cls.semester_id}
                  title={`${cls.class} · Semester ${cls.semester_no}`}
                  hint={`${assignedInClass} of ${cls.courses.length} assigned`}
                >
                  <Table
                    columns={courseColumns(cls.semester_id)}
                    rows={cls.courses}
                    rowKey={(course) => course.course_code}
                    fixedLayout
                  />
                </Panel>
              );
            })
          )}

          {!readOnly && data.classes.length > 0 && (
            <div className={formStyles.actions}>
              <button type="button" className={formStyles.primaryButton} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save allocations"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
