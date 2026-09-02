import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Tag } from "../components/ui/Tag";
import { apiGetAllPages, cached } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { AdminCourse } from "../types/api";
import styles from "./FacultyListPage.module.css";

interface CourseRow {
  courseCode: string;
  courseName: string;
  creditHours: number;
  lab: boolean;
  prerequisite: string | null;
  detailHref: string;
}

const columns: Column<CourseRow>[] = [
  { key: "courseCode", header: "Course code", render: (row) => row.courseCode },
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        {row.courseName}
      </Link>
    ),
  },
  { key: "creditHours", header: "Credit hours", render: (row) => row.creditHours },
  { key: "lab", header: "Lab", render: (row) => (row.lab ? <Tag tone="good">Lab</Tag> : "—") },
  { key: "prerequisite", header: "Prerequisite", render: (row) => row.prerequisite ?? "—" },
];

export function CourseListPage() {
  useAdminPageConfig("Courses");
  const navigate = useNavigate();
  const [courses, setCourses] = useState<AdminCourse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [prefix, setPrefix] = useState("");
  const [lab, setLab] = useState("");

  useEffect(() => {
    let cancelled = false;
    cached("admin:courses", () => apiGetAllPages<AdminCourse>("/admin/courses/"))
      .then((res) => {
        if (!cancelled) setCourses(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const prefixes = useMemo(
    () => Array.from(new Set((courses ?? []).map((c) => c.course_code.split("-")[0]))).sort(),
    [courses],
  );

  const rows: CourseRow[] = useMemo(() => {
    return (courses ?? [])
      .map((c) => ({
        courseCode: c.course_code,
        courseName: c.course_name,
        creditHours: c.credit_hours,
        lab: c.lab,
        prerequisite: c.pre_requisite,
        detailHref: `/admin/courses/${c.course_code}`,
      }))
      .filter((row) => {
        if (prefix && !row.courseCode.startsWith(`${prefix}-`)) return false;
        if (lab && String(row.lab) !== lab) return false;
        if (search) {
          const needle = search.toLowerCase();
          if (!row.courseCode.toLowerCase().includes(needle) && !row.courseName.toLowerCase().includes(needle)) return false;
        }
        return true;
      });
  }, [courses, prefix, lab, search]);

  if (error) {
    return <div className={styles.empty}>{error}</div>;
  }

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by course code or name…"
        selects={[
          {
            id: "prefix",
            value: prefix,
            onChange: setPrefix,
            placeholder: "All prefixes",
            options: prefixes.map((p) => ({ value: p, label: p })),
          },
          {
            id: "lab",
            value: lab,
            onChange: setLab,
            placeholder: "Lab or lecture",
            options: [
              { value: "true", label: "Has lab" },
              { value: "false", label: "No lab" },
            ],
          },
        ]}
        addHref="/admin/courses/new"
        addLabel="+ New course"
      />

      <Panel title="Courses" hint={courses ? `${rows.length} of ${courses.length}` : undefined}>
        {!courses && <p className={styles.empty}>Loading courses…</p>}
        {courses && rows.length > 0 && <Table columns={columns} rows={rows} rowKey={(row) => row.courseCode} />}
        {courses && rows.length === 0 && <p className={styles.empty}>No courses match these filters.</p>}
      </Panel>
    </>
  );
}
