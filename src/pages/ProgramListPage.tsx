import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { ProgramFeeSwarm } from "../components/charts/ProgramFeeSwarm";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { mockPrograms, selectProgramListRows } from "../data/programDirectory";
import { selectProgramPoints } from "../data/programInsights";
import { DEPARTMENTS } from "../data/academicStructure";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { ProgramListRow } from "../types/dashboard";
import styles from "./FacultyListPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/admin/dashboard" },
  { id: "faculty", label: "Faculty", icon: IconPerson, href: "/admin/faculty" },
  { id: "students", label: "Students", icon: IconPeople, href: "/admin/students" },
  { id: "departments", label: "Departments", icon: IconBuilding, href: "/admin/departments" },
  { id: "programs", label: "Programs", icon: IconLayers, href: "/admin/programs" },
  { id: "courses", label: "Courses", icon: IconBook, href: "/admin/courses" },
  { id: "classes", label: "Classes", icon: IconGraduationCap, href: "/admin/classes" },
  { id: "allocations", label: "Allocations", icon: IconClipboard, href: "/admin/allocations" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/admin/enrollments" },
  { id: "sessions", label: "Sessions", icon: IconCalendar, href: "/admin/sessions" },
  { id: "semesters", label: "Semesters", icon: IconHourglass, href: "/admin/semesters" },
  { id: "transcripts", label: "Transcripts", icon: IconScroll, href: "/admin/transcripts" },
  { id: "requests", label: "Requests", icon: IconInbox, href: "/admin/requests" },
  { id: "reports", label: "Reports", icon: IconBars },
];

const columns: Column<ProgramListRow>[] = [
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
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [totalSemesters, setTotalSemesters] = useState("");

  const semesterOptions = useMemo(() => {
    const values = Array.from(new Set(mockPrograms.map((p) => p.total_semesters))).sort((a, b) => a - b);
    return values.map((v) => ({ value: String(v), label: `${v} semesters` }));
  }, []);

  const rows = useMemo(() => {
    return selectProgramListRows(mockPrograms).filter((row) => {
      if (department && row.department !== department) return false;
      if (totalSemesters && String(row.totalSemesters) !== totalSemesters) return false;
      if (search) {
        const needle = search.toLowerCase();
        if (!row.programId.toLowerCase().includes(needle) && !row.programName.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [search, department, totalSemesters]);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="programs"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Programs"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
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
            options: DEPARTMENTS.map((d) => ({ value: d.department_id, label: d.department_name })),
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

      <Panel title="Programs by fee" hint="Positioned by fee per semester, colored by department">
        <ProgramFeeSwarm points={selectProgramPoints()} formatFee={(v) => `Rs ${(v / 1000).toFixed(0)}k`} />
      </Panel>

      <Panel title="Programs" hint={`${rows.length} of ${mockPrograms.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(row) => row.programId} />
        ) : (
          <p className={styles.empty}>No programs match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
