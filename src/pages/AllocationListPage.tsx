import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Tag } from "../components/ui/Tag";
import { apiGetAllPages } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { AdminCourseAllocationSummary, CourseAllocationStatus } from "../types/api";
import type { StatusTone } from "../types/dashboard";
import styles from "./FacultyListPage.module.css";

const STATUS_OPTIONS: CourseAllocationStatus[] = ["Inactive", "Active", "Locked", "Completed", "Cancelled"];
const ALLOCATION_STATUS_TONE: Record<CourseAllocationStatus, StatusTone> = {
  Inactive: "warning",
  Active: "good",
  Locked: "warning",
  Completed: "critical",
  Cancelled: "critical",
};

const columns: Column<AdminCourseAllocationSummary>[] = [
  {
    key: "faculty",
    header: "Faculty",
    render: (row) => (
      <Link to={`/admin/faculty/${row.faculty}`} className={styles.nameLink}>
        {row.faculty}
      </Link>
    ),
  },
  {
    key: "course",
    header: "Course",
    render: (row) => (
      <Link to={`/admin/courses/${row.course}`} className={styles.nameLink}>
        {row.course}
      </Link>
    ),
  },
  { key: "semester", header: "Semester", render: (row) => `#${row.semester}` },
  { key: "session", header: "Session", render: (row) => row.session },
  {
    key: "status",
    header: "Status",
    render: (row) => <Tag tone={ALLOCATION_STATUS_TONE[row.status]}>{row.status}</Tag>,
  },
  {
    key: "detail",
    header: "",
    render: (row) => (
      <Link to={`/admin/allocations/${row.allocation_id}`} className={styles.nameLink}>
        View
      </Link>
    ),
  },
];

export function AllocationListPage() {
  useAdminPageConfig("Allocations");
  const navigate = useNavigate();
  const [allocations, setAllocations] = useState<AdminCourseAllocationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiGetAllPages<AdminCourseAllocationSummary>("/admin/allocations/")
      .then((res) => {
        if (!cancelled) setAllocations(res);
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
    return (allocations ?? []).filter((row) => {
      if (status && row.status !== status) return false;
      if (search) {
        const needle = search.toLowerCase();
        if (!row.faculty.toLowerCase().includes(needle) && !row.course.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [allocations, status, search]);

  if (error) {
    return <div className={styles.empty}>{error}</div>;
  }

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by faculty or course…"
        selects={[
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
        ]}
        addHref="/admin/allocations/new"
        addLabel="+ New allocation"
        secondaryHref="/admin/allocations/bulk"
        secondaryLabel="Bulk allocate"
      />

      <Panel title="Allocations" hint={allocations ? `${rows.length} of ${allocations.length}` : undefined}>
        {!allocations && <p className={styles.empty}>Loading allocations…</p>}
        {allocations && rows.length > 0 && <Table columns={columns} rows={rows} rowKey={(row) => String(row.allocation_id)} />}
        {allocations && rows.length === 0 && <p className={styles.empty}>No allocations match these filters.</p>}
      </Panel>
    </>
  );
}
