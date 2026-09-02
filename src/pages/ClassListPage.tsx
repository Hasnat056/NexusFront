import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { HeatmapGrid, type HeatmapCell } from "../components/charts/HeatmapGrid";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { apiGetAllPages, cached } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { AdminClass, AdminProgram, AdminSession, SemesterStatus } from "../types/api";
import styles from "./FacultyListPage.module.css";

interface ClassRow {
  classId: number;
  label: string;
  program: string;
  batchYear: number | null;
  semesterCount: number;
  assignedSemesterCount: number;
  detailHref: string;
}

function classLabel(cls: Pick<AdminClass, "program" | "batch_year">): string {
  return `${cls.program}-${cls.batch_year ?? "?"}`;
}

const STATUS_HEX: Record<SemesterStatus, string> = {
  Inactive: "#c1602a",
  Active: "#3f8a5c",
  Completed: "#b23b3b",
};

const columns: Column<ClassRow>[] = [
  {
    key: "label",
    header: "Class",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        {row.label}
      </Link>
    ),
  },
  { key: "program", header: "Program", render: (row) => row.program },
  { key: "batchYear", header: "Batch year", render: (row) => row.batchYear ?? "—" },
  {
    key: "scheme",
    header: "Scheme of studies",
    render: (row) => `${row.assignedSemesterCount} of ${row.semesterCount} semesters assigned`,
  },
];

export function ClassListPage() {
  useAdminPageConfig("Classes");
  const navigate = useNavigate();
  const [classes, setClasses] = useState<AdminClass[] | null>(null);
  const [programs, setPrograms] = useState<AdminProgram[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cached("admin:classes", () => apiGetAllPages<AdminClass>("/admin/classes/")),
      cached("admin:programs", () => apiGetAllPages<AdminProgram>("/admin/programs/")),
      cached("admin:sessions", () => apiGetAllPages<AdminSession>("/admin/sessions/")),
    ])
      .then(([classesRes, programsRes, sessionsRes]) => {
        if (cancelled) return;
        setClasses(classesRes);
        setPrograms(programsRes);
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

  const rows: ClassRow[] = useMemo(() => {
    return (classes ?? [])
      .map((c) => {
        const semesters = c.scheme_of_studies ?? [];
        const assigned = semesters.filter((s) => s.session !== null || s.semesterdetails_set.some((d) => d.course !== null)).length;
        return {
          classId: c.class_id,
          label: classLabel(c),
          program: c.program,
          batchYear: c.batch_year,
          semesterCount: semesters.length,
          assignedSemesterCount: assigned,
          detailHref: `/admin/classes/${c.class_id}`,
        };
      })
      .filter((row) => {
        if (program && row.program !== program) return false;
        if (search && !row.label.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
  }, [classes, program, search]);

  const heatmap = useMemo(() => {
    const list = classes ?? [];
    const maxSemesters = Math.max(...list.map((c) => c.scheme_of_studies?.length ?? 0), 1);
    const columnLabels = Array.from({ length: maxSemesters }, (_, i) => `S${i + 1}`);
    const sessionLabel = (session: number | null) => {
      if (session === null) return "—";
      const found = sessions.find((s) => s.id === session);
      return found ? `${found.period} ${found.year}` : `#${session}`;
    };
    const cells: HeatmapCell[][] = list.map((c) => {
      const semesters = c.scheme_of_studies ?? [];
      return columnLabels.map((_, i) => {
        const semester = semesters[i];
        if (!semester) {
          return { label: "", color: "var(--color-surface-sunken)", tooltip: `${classLabel(c)} · Semester ${i + 1}: not scaffolded` };
        }
        const courseCount = semester.semesterdetails_set.filter((d) => d.course !== null).length;
        return {
          label: courseCount > 0 ? String(courseCount) : "",
          color: `color-mix(in srgb, ${STATUS_HEX[semester.status] ?? "#8a8071"} ${courseCount > 0 ? 78 : 30}%, var(--color-surface))`,
          textColor: courseCount > 0 ? "var(--color-on-accent)" : "var(--color-ink)",
          tooltip: `${classLabel(c)} · Semester ${semester.semester_no}: ${semester.status}, ${courseCount} course${courseCount === 1 ? "" : "s"}, ${sessionLabel(semester.session)}`,
          href: `/admin/semesters/${semester.semester_id}`,
        };
      });
    });
    return { rowLabels: list.map((c) => classLabel(c)), columnLabels, cells };
  }, [classes, sessions]);

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
            id: "program",
            value: program,
            onChange: setProgram,
            placeholder: "All programs",
            options: programs.map((p) => ({ value: p.program_id, label: p.program_id })),
          },
        ]}
        addHref="/admin/classes/new"
        addLabel="+ New class"
      />

      <Panel title="Curriculum progress" hint="Courses assigned per semester slot, colored by status">
        {classes ? (
          <HeatmapGrid {...heatmap} ariaLabel="Course count per semester slot for each class, colored by semester status" />
        ) : (
          <p className={styles.empty}>Loading…</p>
        )}
      </Panel>

      <Panel title="Classes" hint={classes ? `${rows.length} of ${classes.length}` : undefined}>
        {!classes && <p className={styles.empty}>Loading classes…</p>}
        {classes && rows.length > 0 && <Table columns={columns} rows={rows} rowKey={(row) => String(row.classId)} />}
        {classes && rows.length === 0 && <p className={styles.empty}>No classes match these filters.</p>}
      </Panel>
    </>
  );
}
