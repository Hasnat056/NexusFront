import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { apiGetAllPages, cached } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { AdminSemester, AdminStudentListItem, AdminTranscript } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./FacultyListPage.module.css";

interface Row extends AdminTranscript {
  studentName: string;
  semesterLabel: string;
}

export function TranscriptListPage() {
  useAdminPageConfig("Transcripts");
  const navigate = useNavigate();
  const [transcripts, setTranscripts] = useState<AdminTranscript[] | null>(null);
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [semesters, setSemesters] = useState<AdminSemester[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [student, setStudent] = useState("");
  const [semesterId, setSemesterId] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGetAllPages<AdminTranscript>("/admin/transcripts/"),
      cached("admin:all-students", () => apiGetAllPages<AdminStudentListItem>("/admin/students/")),
      apiGetAllPages<AdminSemester>("/admin/semesters/"),
    ])
      .then(([transcriptsRes, studentsRes, semestersRes]) => {
        if (cancelled) return;
        setTranscripts(transcriptsRes);
        setStudents(studentsRes);
        setSemesters(semestersRes);
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

  const rows: Row[] = useMemo(() => {
    return (transcripts ?? []).map((t) => {
      const s = students.find((st) => st.person.person_id === t.student);
      const sem = semesters.find((sm) => sm.semester_id === t.semester);
      return {
        ...t,
        studentName: s ? `${s.person.first_name} ${s.person.last_name}` : t.student,
        semesterLabel: sem ? `${sem.associated_class} · Semester ${sem.semester_no}` : `Semester #${t.semester}`,
      };
    });
  }, [transcripts, students, semesters]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (student && row.student !== student) return false;
      if (semesterId && String(row.semester) !== semesterId) return false;
      if (search && !row.studentName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, student, semesterId, search]);

  const columns: Column<Row>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <Link to={`/admin/students/${row.student}`} className={styles.nameLink}>
          {row.studentName}
        </Link>
      ),
    },
    {
      key: "semester",
      header: "Semester",
      render: (row) => (
        <Link to={`/admin/semesters/${row.semester}`} className={styles.nameLink}>
          {row.semesterLabel}
        </Link>
      ),
    },
    { key: "credits", header: "Total credits", render: (row) => row.total_credits },
    { key: "gpa", header: "Semester GPA", render: (row) => row.semester_gpa.toFixed(2) },
  ];

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
            id: "student",
            value: student,
            onChange: setStudent,
            placeholder: "All students",
            options: students.map((s) => ({
              value: s.person.person_id,
              label: `${s.person.first_name} ${s.person.last_name}`,
            })),
          },
          {
            id: "semester",
            value: semesterId,
            onChange: setSemesterId,
            placeholder: "All semesters",
            options: semesters.map((s) => ({
              value: String(s.semester_id),
              label: `${s.associated_class} · Semester ${s.semester_no}`,
            })),
          },
        ]}
      />
      <p className={formStyles.hint}>
        Mirrors GET /api/admin/transcripts/ (TranscriptListCreateAPIView) — student and semester
        filter the real endpoint directly (filterset_fields); search matches its search_fields
        (student's person_id/first/last name). There's no create form here — generate transcripts
        for a whole semester from that semester's own page (POST
        /api/admin/semesters/&lt;id&gt;/transcripts-create/), and no way to edit or delete an
        individual one — the real API has no route for either.
      </p>

      <Panel title="Transcripts" hint={transcripts ? `${filteredRows.length} of ${transcripts.length}` : undefined}>
        {!transcripts && <p className={styles.empty}>Loading transcripts…</p>}
        {transcripts && filteredRows.length > 0 && (
          <Table columns={columns} rows={filteredRows} rowKey={(row) => `${row.student}-${row.semester}`} />
        )}
        {transcripts && filteredRows.length === 0 && <p className={styles.empty}>No transcripts match these filters.</p>}
      </Panel>
    </>
  );
}
