import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconBook, IconGrid, IconPerson } from "../components/icons/Icons";
import { ProfileStrip } from "../components/ui/ProfileStrip";
import { CourseCard } from "../components/ui/CourseCard";
import { MyRequestsPanel } from "../components/ui/MyRequestsPanel";
import { mockFacultyDashboardResponse } from "../data/facultyDashboard";
import { mockFacultyAllocations, selectFacultyCourseCards } from "../data/facultyAllocations";
import { getFacultyRequests, selectFacultyRequestListItems } from "../data/facultyRequests";
import styles from "./FacultyDashboardPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/faculty/dashboard" },
  { id: "allocations", label: "Allocations", icon: IconBook, href: "/faculty/allocations" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/faculty/profile" },
];

export function FacultyDashboardPage() {
  const dashboard = mockFacultyDashboardResponse;
  const ongoingAllocations = mockFacultyAllocations.filter((a) => a.status === "Ongoing");
  const courseCards = selectFacultyCourseCards(ongoingAllocations);
  const requestItems = selectFacultyRequestListItems(getFacultyRequests());
  const avatarInitials = `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase();
  const [requestsOpen, setRequestsOpen] = useState(true);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="dashboard"
      homeHref="/faculty/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Faculty dashboard"
      subtitle={dashboard.faculty.institutional_email}
      sidePanel={
        <MyRequestsPanel
          items={requestItems}
          open={requestsOpen}
          onClose={() => setRequestsOpen(false)}
          onOpen={() => setRequestsOpen(true)}
        />
      }
    >
      <ProfileStrip
        avatarInitials={avatarInitials}
        name={`${dashboard.faculty.first_name} ${dashboard.faculty.last_name}`}
        meta={[dashboard.faculty.employee_id]}
        stats={[
          { value: dashboard.course_allocation_count, label: "Allocations" },
          { value: dashboard.active_allocations, label: "Ongoing" },
          { value: dashboard.completed_allocations, label: "Completed" },
        ]}
      />

      <div className={styles.sectionHead}>
        <h2>Ongoing courses</h2>
        <Link to="/faculty/allocations">View all allocations →</Link>
      </div>
      <div className={styles.courseGrid}>
        {courseCards.map((card) => (
          <CourseCard key={card.id} {...card} />
        ))}
      </div>
      {courseCards.length === 0 && <p className={styles.empty}>No ongoing allocations right now.</p>}
    </DashboardShell>
  );
}
