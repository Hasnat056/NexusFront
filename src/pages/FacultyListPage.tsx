import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Avatar } from "../components/ui/Avatar";
import { DESIGNATIONS, selectFacultyListRows } from "../data/facultyDirectory";
import type { FacultyListRow } from "../types/dashboard";
import type { AdminDepartment, AdminFacultyListResponse } from "../types/api";
import { apiGet, apiGetAllPages, cached } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import formStyles from "../components/ui/Form.module.css";
import styles from "./FacultyListPage.module.css";

const columns: Column<FacultyListRow>[] = [
  {
    key: "avatar",
    header: "",
    render: (row) => <Avatar src={row.image} name={row.name} />,
  },
  {
    key: "employeeId",
    header: "Employee ID",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        {row.employeeId}
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
  { key: "department", header: "Department", render: (row) => row.department },
  { key: "designation", header: "Designation", render: (row) => row.designation },
  { key: "email", header: "Email", render: (row) => row.email },
];

const PAGE_SIZE = 10;

export function FacultyListPage() {
  const navigate = useNavigate();
  useAdminPageConfig("Faculty directory");
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AdminFacultyListResponse | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // The department list (for the filter dropdown) is small and shared across
  // every page that needs it — cached, so this only ever fetches once.
  useEffect(() => {
    let cancelled = false;
    cached("admin:departments", () => apiGetAllPages<AdminDepartment>("/admin/departments/"))
      .then((res) => {
        if (!cancelled) setDepartments(res);
      })
      .catch(() => {
        // Non-fatal: the dropdown just stays empty (only "All departments") if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any filter change should restart pagination at page 1. Tracked via a ref
  // (rather than a separate effect that calls setPage) so a filter change
  // doesn't fire one fetch for the old page and a second for the reset page.
  const filterKey = `${debouncedSearch}|${department}|${designation}`;
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
    if (department) params.set("department", department);
    if (designation) params.set("designation", designation);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();

    apiGet<AdminFacultyListResponse>(`/admin/faculty/${qs ? `?${qs}` : ""}`)
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
  }, [filterKey, debouncedSearch, department, designation, page, navigate]);

  const rows = data ? selectFacultyListRows(data.results) : [];
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        selects={[
          {
            id: "department",
            value: department,
            onChange: setDepartment,
            placeholder: "All departments",
            options: departments.map((d) => ({ value: d.department_id, label: d.department_name })),
          },
          {
            id: "designation",
            value: designation,
            onChange: setDesignation,
            placeholder: "All designations",
            options: DESIGNATIONS.map((d) => ({ value: d, label: d })),
          },
        ]}
        addHref="/admin/faculty/new"
        addLabel="+ New faculty"
      />

      <Panel title="Faculty" hint={data ? `${data.count} total` : undefined}>
        {listError && <div className={formStyles.errorBanner}>{listError}</div>}
        {!listError && !data && <p className={styles.empty}>Loading faculty…</p>}
        {!listError && rows.length > 0 && <Table columns={columns} rows={rows} rowKey={(row) => row.employeeId} />}
        {!listError && data && rows.length === 0 && <p className={styles.empty}>No faculty match these filters.</p>}
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
