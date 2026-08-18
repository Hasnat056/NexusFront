import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import {
  IconScroll,
  IconHourglass,
  IconInbox,
  IconBars,
  IconBook,
  IconBuilding,
  IconCalendar,
  IconClipboard,
  IconGraduationCap,
  IconLayers,
  IconGrid,
  IconPeople,
  IconPerson,
  IconUserCheck,
} from "../components/icons/Icons";
import { HeatmapGrid } from "../components/charts/HeatmapGrid";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { selectClassSchemeHeatmap } from "../data/classInsights";
import { mockClasses, selectClassListRows } from "../data/classDirectory";
import { mockPrograms } from "../data/programDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { ClassListRow } from "../types/dashboard";
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

const columns: Column<ClassListRow>[] = [
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
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("");

  const rows = useMemo(() => {
    return selectClassListRows(mockClasses).filter((row) => {
      if (program && row.program !== program) return false;
      if (search && !row.label.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, program]);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="classes"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Classes"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
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
            options: mockPrograms.map((p) => ({ value: p.program_id, label: p.program_id })),
          },
        ]}
        addHref="/admin/classes/new"
        addLabel="+ New class"
      />

      <Panel title="Curriculum progress" hint="Courses assigned per semester slot, colored by status">
        <HeatmapGrid {...selectClassSchemeHeatmap()} ariaLabel="Course count per semester slot for each class, colored by semester status" />
      </Panel>

      <Panel title="Classes" hint={`${rows.length} of ${mockClasses.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(row) => String(row.classId)} />
        ) : (
          <p className={styles.empty}>No classes match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
