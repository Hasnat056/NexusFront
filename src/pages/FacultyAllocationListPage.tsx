import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconBook, IconGrid, IconPerson } from "../components/icons/Icons";
import { CourseCard } from "../components/ui/CourseCard";
import { mockFacultyAllocations, selectFacultyCourseCards, sortFacultyAllocationsForList } from "../data/facultyAllocations";
import { mockFacultyDashboardResponse } from "../data/facultyDashboard";
import styles from "./FacultyDashboardPage.module.css";
import listStyles from "./PersonDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/faculty/dashboard" },
  { id: "allocations", label: "Allocations", icon: IconBook, href: "/faculty/allocations" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/faculty/profile" },
];

export function FacultyAllocationListPage() {
  const dashboard = mockFacultyDashboardResponse;
  const avatarInitials = `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase();
  const ordered = sortFacultyAllocationsForList(mockFacultyAllocations);
  const courseCards = selectFacultyCourseCards(ordered);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="allocations"
      homeHref="/faculty/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Allocations"
      subtitle={`${dashboard.faculty.institutional_email} · Ongoing first, then completed`}
    >
      {courseCards.length > 0 ? (
        <div className={styles.courseGrid}>
          {courseCards.map((card) => (
            <CourseCard key={card.id} {...card} />
          ))}
        </div>
      ) : (
        <p className={listStyles.empty}>No allocations yet.</p>
      )}
    </DashboardShell>
  );
}
