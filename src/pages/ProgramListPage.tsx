import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { ProgramStatusStackedBar, type ProgramStatusPoint } from "../components/charts/ProgramStatusStackedBar";
import { STUDENT_STATUS_ORDER } from "../lib/studentStatusColors";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { apiGetAllPages, cached } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { AdminDepartment, AdminProgram, AdminStudentListItem } from "../types/api";
import styles from "./FacultyListPage.module.css";

interface ProgramRow {
  programId: string;
  programName: string;
  department: string;
  totalSemesters: number;
  feePerSemester: number | null;
  detailHref: string;
}

const columns: Column<ProgramRow>[] = [
  { key: "programId", header: "Program ID", render: (row) => row.programId },
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        {row.programName}
      </Link>
    ),
  },
  { key: "department", header: "Department", render: (row) => row.department },
  { key: "totalSemesters", header: "Semesters", render: (row) => row.totalSemesters },
  {
    key: "fee",
    header: "Fee / semester",
    render: (row) => (row.feePerSemester != null ? row.feePerSemester.toLocaleString("en-US") : "—"),
  },
];

export function ProgramListPage() {
  useAdminPageConfig("Programs");
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<AdminProgram[] | null>(null);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [totalSemesters, setTotalSemesters] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cached("admin:programs", () => apiGetAllPages<AdminProgram>("/admin/programs/")),
      cached("admin:departments", () => apiGetAllPages<AdminDepartment>("/admin/departments/")),
      cached("admin:all-students", () => apiGetAllPages<AdminStudentListItem>("/admin/students/")),
    ])
      .then(([programsRes, departmentsRes, studentsRes]) => {
        if (cancelled) return;
        setPrograms(programsRes);
        setDepartments(departmentsRes);
        setStudents(studentsRes);
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

  const semesterOptions = useMemo(() => {
    const values = Array.from(new Set((programs ?? []).map((p) => p.total_semesters))).sort((a, b) => a - b);
    return values.map((v) => ({ value: String(v), label: `${v} semesters` }));
  }, [programs]);

  const rows: ProgramRow[] = useMemo(() => {
    return (programs ?? [])
      .map((p) => ({
        programId: p.program_id,
        programName: p.program_name,
        department: p.department,
        totalSemesters: p.total_semesters,
        feePerSemester: p.fee_per_semester,
        detailHref: `/admin/programs/${p.program_id}`,
      }))
      .filter((row) => {
        if (department && row.department !== department) return false;
        if (totalSemesters && String(row.totalSemesters) !== totalSemesters) return false;
        if (search) {
          const needle = search.toLowerCase();
          if (!row.programId.toLowerCase().includes(needle) && !row.programName.toLowerCase().includes(needle)) return false;
        }
        return true;
      });
  }, [programs, department, totalSemesters, search]);

  const statusPoints: ProgramStatusPoint[] = useMemo(
    () =>
      (programs ?? []).map((p) => {
        const counts: ProgramStatusPoint["counts"] = {};
        for (const status of STUDENT_STATUS_ORDER) {
          counts[status] = students.filter((s) => s.program === p.program_id && s.status === status).length;
        }
        return {
          programId: p.program_id,
          programName: p.program_name,
          detailHref: `/admin/programs/${p.program_id}`,
          counts,
        };
      }),
    [programs, students],
  );

  if (error) {
    return <div className={styles.empty}>{error}</div>;
  }

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by program ID or name…"
        selects={[
          {
            id: "department",
            value: department,
            onChange: setDepartment,
            placeholder: "All departments",
            options: departments.map((d) => ({ value: d.department_id, label: d.department_name })),
          },
          {
            id: "total_semesters",
            value: totalSemesters,
            onChange: setTotalSemesters,
            placeholder: "All lengths",
            options: semesterOptions,
          },
        ]}
        addHref="/admin/programs/new"
        addLabel="+ New program"
      />

      <Panel title="Enrollment by status" hint="Student headcount per program, broken down by status">
        <ProgramStatusStackedBar points={statusPoints} />
      </Panel>

      <Panel title="Programs" hint={programs ? `${rows.length} of ${programs.length}` : undefined}>
        {!programs && <p className={styles.empty}>Loading programs…</p>}
        {programs && rows.length > 0 && <Table columns={columns} rows={rows} rowKey={(row) => row.programId} />}
        {programs && rows.length === 0 && <p className={styles.empty}>No programs match these filters.</p>}
      </Panel>
    </>
  );
}
