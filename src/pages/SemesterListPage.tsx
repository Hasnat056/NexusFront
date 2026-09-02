import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Tag } from "../components/ui/Tag";
import { apiGetAllPages, cached } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { AdminClass, AdminSemester, AdminSession, SemesterStatus } from "../types/api";
import type { StatusTone } from "../types/dashboard";
import styles from "./FacultyListPage.module.css";

const STATUS_OPTIONS: SemesterStatus[] = ["Inactive", "Active", "Completed"];
const SEMESTER_STATUS_TONE: Record<SemesterStatus, StatusTone> = {
  Inactive: "warning",
  Active: "good",
  Completed: "critical",
};

function formatSessionDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function classLabel(cls: Pick<AdminClass, "program" | "batch_year">): string {
  return `${cls.program}-${cls.batch_year ?? "?"}`;
}

export function SemesterListPage() {
  useAdminPageConfig("Semesters");
  const navigate = useNavigate();
  const [semesters, setSemesters] = useState<AdminSemester[] | null>(null);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [associatedClass, setAssociatedClass] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGetAllPages<AdminSemester>("/admin/semesters/"),
      cached("admin:classes", () => apiGetAllPages<AdminClass>("/admin/classes/")),
      cached("admin:sessions", () => apiGetAllPages<AdminSession>("/admin/sessions/")),
    ])
      .then(([semestersRes, classesRes, sessionsRes]) => {
        if (cancelled) return;
        setSemesters(semestersRes);
        setClasses(classesRes);
        setSessions(sessionsRes);
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

  const classIdByLabel = useMemo(() => new Map(classes.map((c) => [classLabel(c), c.class_id])), [classes]);
  const sessionLabel = (session: number | null) => {
    if (session === null) return "—";
    const found = sessions.find((s) => s.id === session);
    return found ? `${found.period} ${found.year}` : `#${session}`;
  };

  const columns: Column<AdminSemester>[] = [
    {
      key: "class",
      header: "Class",
      render: (row) => {
        const classId = classIdByLabel.get(row.associated_class);
        return classId ? (
          <Link to={`/admin/classes/${classId}`} className={styles.nameLink}>
            {row.associated_class}
          </Link>
        ) : (
          row.associated_class
        );
      },
    },
    {
      key: "semester",
      header: "Semester",
      render: (row) => (
        <Link to={`/admin/semesters/${row.semester_id}`} className={styles.nameLink}>
          Semester {row.semester_no}
        </Link>
      ),
    },
    { key: "session", header: "Session", render: (row) => sessionLabel(row.session) },
    { key: "status", header: "Status", render: (row) => <Tag tone={SEMESTER_STATUS_TONE[row.status]}>{row.status}</Tag> },
    { key: "activation", header: "Activation deadline", render: (row) => formatSessionDateTime(row.activation_deadline) },
    { key: "closing", header: "Closing deadline", render: (row) => formatSessionDateTime(row.closing_deadline) },
  ];

  const rows = useMemo(() => {
    return (semesters ?? []).filter((s) => {
      if (status && s.status !== status) return false;
      if (associatedClass && s.associated_class !== associatedClass) return false;
      if (search && !s.associated_class.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [semesters, status, associatedClass, search]);

  const classOptions = useMemo(() => Array.from(new Set(classes.map((c) => classLabel(c)))).sort(), [classes]);

  if (error) {
    return <div className={styles.empty}>{error}</div>;
  }

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by class…"
        selects={[
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            id: "class",
            value: associatedClass,
            onChange: setAssociatedClass,
            placeholder: "All classes",
            options: classOptions.map((label) => ({ value: label, label })),
          },
        ]}
      />
      <Panel title="Semesters" hint={semesters ? `${rows.length} of ${semesters.length}` : undefined}>
        {!semesters && <p className={styles.empty}>Loading semesters…</p>}
        {semesters && rows.length > 0 && <Table columns={columns} rows={rows} rowKey={(row) => String(row.semester_id)} />}
        {semesters && rows.length === 0 && <p className={styles.empty}>No semesters match these filters.</p>}
      </Panel>
    </>
  );
}
