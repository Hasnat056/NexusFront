import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Tag } from "../components/ui/Tag";
import { coursePrefixes, mockCourses, selectCourseListRows } from "../data/courseDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { CourseListRow } from "../types/dashboard";
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

const columns: Column<CourseListRow>[] = [
  { key: "courseCode", header: "Course code", render: (row) => row.courseCode },
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        {row.courseName}
      </Link>
    ),
  },
  { key: "creditHours", header: "Credit hours", render: (row) => row.creditHours },
  { key: "lab", header: "Lab", render: (row) => (row.lab ? <Tag tone="good">Lab</Tag> : "—") },
  { key: "prerequisite", header: "Prerequisite", render: (row) => row.prerequisite ?? "—" },
];

export function CourseListPage() {
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [prefix, setPrefix] = useState("");
  const [lab, setLab] = useState("");

  const prefixes = useMemo(() => coursePrefixes(mockCourses), []);

  const rows = useMemo(() => {
    return selectCourseListRows(mockCourses).filter((row) => {
      if (prefix && !row.courseCode.startsWith(`${prefix}-`)) return false;
      if (lab && String(row.lab) !== lab) return false;
      if (search) {
        const needle = search.toLowerCase();
        if (!row.courseCode.toLowerCase().includes(needle) && !row.courseName.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [search, prefix, lab]);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="courses"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Courses"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by course code or name…"
        selects={[
          {
            id: "prefix",
            value: prefix,
            onChange: setPrefix,
            placeholder: "All prefixes",
            options: prefixes.map((p) => ({ value: p, label: p })),
          },
          {
            id: "lab",
            value: lab,
            onChange: setLab,
            placeholder: "Lab or lecture",
            options: [
              { value: "true", label: "Has lab" },
              { value: "false", label: "No lab" },
            ],
          },
        ]}
        addHref="/admin/courses/new"
        addLabel="+ New course"
      />

      <Panel title="Courses" hint={`${rows.length} of ${mockCourses.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(row) => row.courseCode} />
        ) : (
          <p className={styles.empty}>No courses match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
