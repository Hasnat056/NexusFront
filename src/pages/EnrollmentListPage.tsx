import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Tag } from "../components/ui/Tag";
import { apiGetAllPages } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { AdminEnrollmentSummary, EnrollmentStatus } from "../types/api";
import type { StatusTone } from "../types/dashboard";
import styles from "./FacultyListPage.module.css";

const STATUS_OPTIONS: EnrollmentStatus[] = ["Inactive", "Active", "Completed", "Dropped"];
const ENROLLMENT_STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  Inactive: "warning",
  Active: "good",
  Completed: "critical",
  Dropped: "critical",
};

const columns: Column<AdminEnrollmentSummary>[] = [
  {
    key: "student",
    header: "Student",
    render: (row) => (
      <Link to={`/admin/students/${row.student}`} className={styles.nameLink}>
        {row.student_info?.student_name ?? row.student}
      </Link>
    ),
  },
  { key: "allocation", header: "Allocation", render: (row) => `#${row.allocation}` },
  { key: "date", header: "Enrolled", render: (row) => row.enrollment_date },
  { key: "status", header: "Status", render: (row) => <Tag tone={ENROLLMENT_STATUS_TONE[row.status]}>{row.status}</Tag> },
  { key: "gpa", header: "GPA", render: (row) => row.result?.course_gpa ?? "—" },
  {
    key: "detail",
    header: "",
    render: (row) => (
      <Link to={`/admin/enrollments/${row.enrollment_id}`} className={styles.nameLink}>
        View
      </Link>
    ),
  },
];

export function EnrollmentListPage() {
  useAdminPageConfig("Enrollments");
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<AdminEnrollmentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiGetAllPages<AdminEnrollmentSummary>("/admin/enrollments/")
      .then((res) => {
        if (!cancelled) setEnrollments(res);
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

  const rows = useMemo(() => {
    return (enrollments ?? []).filter((row) => {
      if (status && row.status !== status) return false;
      if (search) {
        const needle = search.toLowerCase();
        const name = row.student_info?.student_name ?? "";
        if (!name.toLowerCase().includes(needle) && !row.student.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [enrollments, status, search]);

  if (error) {
    return <div className={styles.empty}>{error}</div>;
  }

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by student…"
        selects={[
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
        ]}
        addHref="/admin/enrollments/new"
        addLabel="+ New enrollment"
      />

      <Panel title="Enrollments" hint={enrollments ? `${rows.length} of ${enrollments.length}` : undefined}>
        {!enrollments && <p className={styles.empty}>Loading enrollments…</p>}
        {enrollments && rows.length > 0 && <Table columns={columns} rows={rows} rowKey={(row) => String(row.enrollment_id)} />}
        {enrollments && rows.length === 0 && <p className={styles.empty}>No enrollments match these filters.</p>}
      </Panel>
    </>
  );
}
