import { useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Avatar } from "../components/ui/Avatar";
import { DESIGNATIONS, mockFacultyDirectory, selectFacultyListRows } from "../data/facultyDirectory";
import { DEPARTMENTS } from "../data/academicStructure";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { FacultyListRow } from "../types/dashboard";
import { Link } from "react-router-dom";
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

const columns: Column<FacultyListRow>[] = [
  {
    key: "avatar",
    header: "",
    render: (row) => <Avatar src={row.image} name={row.name} />,
  },
  { key: "employeeId", header: "Employee ID", render: (row) => row.employeeId },
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

export function FacultyListPage() {
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");

  const rows = useMemo(() => {
    return selectFacultyListRows(mockFacultyDirectory).filter((row) => {
      if (department && row.department !== department) return false;
      if (designation && row.designation !== designation) return false;
      if (search) {
        const needle = search.toLowerCase();
        if (!row.name.toLowerCase().includes(needle) && !row.email.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [search, department, designation]);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="faculty"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Faculty directory"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
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
            options: DEPARTMENTS.map((d) => ({ value: d.department_id, label: d.department_name })),
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
        secondaryHref="/admin/bulk?type=faculty"
        secondaryLabel="Bulk import"
      />

      <Panel title="Faculty" hint={`${rows.length} of ${mockFacultyDirectory.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(row) => row.employeeId} />
        ) : (
          <p className={styles.empty}>No faculty match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
