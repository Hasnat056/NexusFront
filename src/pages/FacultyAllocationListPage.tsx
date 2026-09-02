import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { FACULTY_RAIL_ITEMS } from "../components/layout/facultyRailItems";
import { CourseCard } from "../components/ui/CourseCard";
import { selectFacultyCourseCards, sortFacultyAllocationsForList } from "../data/facultyAllocations";
import { apiGet, apiGetAllPages } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { FacultyCourseAllocation, FacultyDashboardResponse } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./FacultyDashboardPage.module.css";
import listStyles from "./PersonDetailPage.module.css";

export function FacultyAllocationListPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<FacultyDashboardResponse | null>(null);
  const [allocations, setAllocations] = useState<FacultyCourseAllocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<FacultyDashboardResponse>("/faculty/dashboard/"),
      apiGetAllPages<FacultyCourseAllocation>("/faculty/allocations/"),
    ])
      .then(([dashboardRes, allocationsRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        setAllocations(allocationsRes);
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

  if (error) {
    return (
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="allocations"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials="—"
        pageTitle="Allocations"
        subtitle=""
      >
        <div className={formStyles.errorBanner}>{error}</div>
      </DashboardShell>
    );
  }

  if (!dashboard) {
    return (
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="allocations"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials="—"
        pageTitle="Allocations"
        subtitle=""
      >
        <p className={listStyles.empty}>Loading allocations…</p>
      </DashboardShell>
    );
  }

  const avatarInitials = `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase();
  const ordered = sortFacultyAllocationsForList(allocations);
  const courseCards = selectFacultyCourseCards(ordered);

  return (
    <DashboardShell
      railItems={FACULTY_RAIL_ITEMS}
      activeRailId="allocations"
      homeHref="/faculty/dashboard"
      profileHref="/faculty/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.faculty.image}
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
