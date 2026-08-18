import type { ReactNode } from "react";
import { Rail, type RailNavItem } from "./Rail";
import { TopBar } from "./TopBar";
import styles from "./DashboardShell.module.css";

interface DashboardShellProps {
  railItems: RailNavItem[];
  activeRailId: string;
  homeHref: string;
  avatarInitials: string;
  pageTitle: string;
  sessionLabel?: string;
  subtitle: string;
  topBarExtra?: ReactNode;
  sidePanel?: ReactNode;
  profileHref?: string;
  children: ReactNode;
}

export function DashboardShell({
  railItems,
  activeRailId,
  homeHref,
  avatarInitials,
  pageTitle,
  sessionLabel,
  subtitle,
  topBarExtra,
  sidePanel,
  profileHref,
  children,
}: DashboardShellProps) {
  return (
    <div className={styles.app}>
      <Rail items={railItems} activeId={activeRailId} avatarInitials={avatarInitials} homeHref={homeHref} />
      <div className={styles.main}>
        <TopBar
          title={pageTitle}
          sessionLabel={sessionLabel}
          subtitle={subtitle}
          avatarInitials={avatarInitials}
          extraRight={topBarExtra}
          profileHref={profileHref}
        />
        <div className={styles.bodySplit}>
          <div className={styles.content}>{children}</div>
          {sidePanel}
        </div>
      </div>
    </div>
  );
}
