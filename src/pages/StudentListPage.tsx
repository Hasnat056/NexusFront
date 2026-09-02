import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Tag } from "../components/ui/Tag";
import { Avatar } from "../components/ui/Avatar";
import { STUDENT_STATUSES, selectStudentListRows } from "../data/studentDirectory";
import type { StudentListRow } from "../types/dashboard";
import type { AdminProgram, AdminStudentListResponse } from "../types/api";
import { apiGet, apiGetAllPages, cached } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import formStyles from "../components/ui/Form.module.css";
import styles from "./FacultyListPage.module.css";

const columns: Column<StudentListRow>[] = [
  {
    key: "avatar",
    header: "",
    render: (row) => <Avatar src={row.image} name={row.name} />,
  },
  {
    key: "studentId",
    header: "Student ID",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        {row.studentId}
      </Link>
    ),
  },
  {
    key: "name",
    header: "Full name",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        {row.name}
      </Link>
    ),
  },
  { key: "program", header: "Program", render: (row) => row.program },
  { key: "class", header: "Class", render: (row) => row.studentClass },
  { key: "status", header: "Status", render: (row) => <Tag tone={row.status.tone}>{row.status.label}</Tag> },
  { key: "email", header: "Email", render: (row) => row.email },
];

const PAGE_SIZE = 10;

export function StudentListPage() {
  const navigate = useNavigate();
  useAdminPageConfig("Student directory");
  const [programs, setPrograms] = useState<AdminProgram[]>([]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AdminStudentListResponse | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // The program list (for the filter dropdown) is small and shared across
  // every page that needs it — cached, so this only ever fetches once.
  useEffect(() => {
    let cancelled = false;
    cached("admin:programs", () => apiGetAllPages<AdminProgram>("/admin/programs/"))
      .then((res) => {
        if (!cancelled) setPrograms(res);
      })
      .catch(() => {
        // Non-fatal: the dropdown just stays empty (only "All programs") if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any filter change should restart pagination at page 1. Tracked via a ref
  // (rather than a separate effect that calls setPage) so a filter change
  // doesn't fire one fetch for the old page and a second for the reset page.
  const filterKey = `${debouncedSearch}|${program}|${status}`;
  const prevFilterKey = useRef(filterKey);

  useEffect(() => {
    if (filterKey !== prevFilterKey.current) {
      prevFilterKey.current = filterKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    let cancelled = false;
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (program) params.set("program", program);
    if (status) params.set("status", status);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();

    apiGet<AdminStudentListResponse>(`/admin/students/${qs ? `?${qs}` : ""}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setListError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [filterKey, debouncedSearch, program, status, page, navigate]);

  const rows = data ? selectStudentListRows(data.results) : [];
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        selects={[
          {
            id: "program",
            value: program,
            onChange: setProgram,
            placeholder: "All programs",
            options: programs.map((p) => ({ value: p.program_id, label: p.program_name })),
          },
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STUDENT_STATUSES.map((s) => ({ value: s, label: s })),
          },
        ]}
        addHref="/admin/students/new"
        addLabel="+ New student"
      />

      <Panel title="Students" hint={data ? `${data.count} total` : undefined}>
        {listError && <div className={formStyles.errorBanner}>{listError}</div>}
        {!listError && !data && <p className={styles.empty}>Loading students…</p>}
        {!listError && rows.length > 0 && <Table columns={columns} rows={rows} rowKey={(row) => row.studentId} />}
        {!listError && data && rows.length === 0 && <p className={styles.empty}>No students match these filters.</p>}
        {!listError && data && (
          <div className={styles.pager}>
            <span className={styles.pagerInfo}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className={styles.pagerButton}
              onClick={() => setPage((p) => p - 1)}
              disabled={!data.previous}
            >
              Prev
            </button>
            <button
              type="button"
              className={styles.pagerButton}
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.next}
            >
              Next
            </button>
          </div>
        )}
      </Panel>
    </>
  );
}
