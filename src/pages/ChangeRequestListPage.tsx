import { useEffect, useMemo, useState } from "react";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Tag } from "../components/ui/Tag";
import { Link, useNavigate } from "react-router-dom";
import { apiGetAllPages, cached } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import { CHANGE_REQUEST_STATUS_TONE, CHANGE_TYPE_LABEL, changeRequestHeadline, formatRelativeTime } from "../data/changeRequests";
import type { AdminDepartment, AdminFacultyListItem, AdminStudentListItem, ChangeRequest } from "../types/api";
import styles from "./FacultyListPage.module.css";

const STATUS_OPTIONS: ChangeRequest["status"][] = ["pending", "confirmed", "applied", "declined", "expired"];
const TYPE_OPTIONS: ChangeRequest["change_type"][] = ["hod_change", "faculty_delete", "student_delete", "result_calculation"];

interface Row {
  id: number;
  headline: string;
  status: ChangeRequest["status"];
  relativeTime: string;
  requestedBy: number;
}

export function ChangeRequestListPage() {
  useAdminPageConfig("Change requests");
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ChangeRequest[] | null>(null);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [faculty, setFaculty] = useState<AdminFacultyListItem[]>([]);
  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGetAllPages<ChangeRequest>("/admin/requests/"),
      cached("admin:departments", () => apiGetAllPages<AdminDepartment>("/admin/departments/")),
      cached("admin:all-faculty", () => apiGetAllPages<AdminFacultyListItem>("/admin/faculty/")),
      cached("admin:all-students", () => apiGetAllPages<AdminStudentListItem>("/admin/students/")),
    ])
      .then(([requestsRes, departmentsRes, facultyRes, studentsRes]) => {
        if (cancelled) return;
        setRequests(requestsRes);
        setDepartments(departmentsRes);
        setFaculty(facultyRes);
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

  function headlineFor(cr: ChangeRequest): string {
    if (cr.change_type === "hod_change") {
      const dept = departments.find((d) => d.department_id === cr.department);
      return `${CHANGE_TYPE_LABEL.hod_change} requested: ${dept?.department_name ?? cr.department ?? "department"}`;
    }
    if (cr.change_type === "faculty_delete") {
      const f = faculty.find((x) => x.person.person_id === cr.target_faculty);
      const name = f ? `${f.person.first_name} ${f.person.last_name}` : cr.target_faculty;
      return `${CHANGE_TYPE_LABEL.faculty_delete} requested: ${name ?? "faculty member"}`;
    }
    if (cr.change_type === "student_delete") {
      const s = students.find((x) => x.person.person_id === cr.target_student);
      const name = s ? `${s.person.first_name} ${s.person.last_name}` : cr.target_student;
      return `${CHANGE_TYPE_LABEL.student_delete} requested: ${name ?? "student"}`;
    }
    return changeRequestHeadline(cr);
  }

  const rows: Row[] = useMemo(() => {
    return (requests ?? []).map((cr) => ({
      id: cr.id,
      headline: headlineFor(cr),
      status: cr.status,
      relativeTime: formatRelativeTime(cr.requested_at),
      requestedBy: cr.requested_by,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, departments, faculty, students]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const cr = requests?.find((r) => r.id === row.id);
      if (!cr) return false;
      if (status && cr.status !== status) return false;
      if (type && cr.change_type !== type) return false;
      if (search && !row.headline.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, requests, status, type, search]);

  const columns: Column<Row>[] = [
    {
      key: "headline",
      header: "Request",
      render: (row) => (
        <Link to={`/admin/requests/${row.id}`} className={styles.nameLink}>
          {row.headline}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => {
        const cr = requests?.find((r) => r.id === row.id);
        return cr ? CHANGE_TYPE_LABEL[cr.change_type] : "";
      },
    },
    { key: "status", header: "Status", render: (row) => <Tag tone={CHANGE_REQUEST_STATUS_TONE[row.status]}>{row.status}</Tag> },
    { key: "requestedBy", header: "Requested by", render: (row) => `User #${row.requestedBy}` },
    { key: "time", header: "Requested", render: (row) => row.relativeTime },
  ];

  if (error) {
    return <div className={styles.empty}>{error}</div>;
  }

  return (
    <>
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by request…"
        selects={[
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            id: "type",
            value: type,
            onChange: setType,
            placeholder: "All types",
            options: TYPE_OPTIONS.map((t) => ({ value: t, label: CHANGE_TYPE_LABEL[t] })),
          },
        ]}
      />
      <Panel title="Change requests" hint={requests ? `${filteredRows.length} of ${requests.length}` : undefined}>
        {!requests && <p className={styles.empty}>Loading change requests…</p>}
        {requests && filteredRows.length > 0 && <Table columns={columns} rows={filteredRows} rowKey={(row) => String(row.id)} />}
        {requests && filteredRows.length === 0 && <p className={styles.empty}>No change requests match these filters.</p>}
      </Panel>
    </>
  );
}
