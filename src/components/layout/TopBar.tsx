import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SessionCountdownStepper } from "../charts/SessionCountdownStepper";
import type { CurrentSessionPill } from "../../hooks/useCurrentSession";
import styles from "./TopBar.module.css";

interface TopBarProps {
  title: string;
  /** The live session's label/tone/status/deadlines, straight from useCurrentSessionPill() — null
   * (or omitted) hides the pill entirely. While status is Initiated or Available, a small "sm"
   * SessionCountdownStepper renders right after the label showing days until Available/Active. */
  sessionPill?: CurrentSessionPill | null;
  subtitle: string;
  avatarInitials: string;
  avatarSrc?: string | null;
  extraRight?: ReactNode;
  profileHref?: string;
}

export function TopBar({ title, sessionPill, subtitle, avatarInitials, avatarSrc, extraRight, profileHref }: TopBarProps) {
  const avatar = <div className={styles.avatar}>{avatarSrc ? <img src={avatarSrc} alt="" /> : avatarInitials}</div>;
  const showCountdown = sessionPill?.status === "Initiated" || sessionPill?.status === "Available";

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <h2 className={styles.title}>{title}</h2>
        {sessionPill && (
          <span className={styles.sessionPill}>
            <span className={styles.dot} data-tone={sessionPill.tone} />
            {sessionPill.label}
            {showCountdown && (
              <SessionCountdownStepper
                size="sm"
                availabilityDeadline={sessionPill.availabilityDeadline}
                activationDeadline={sessionPill.activationDeadline}
                closingDeadline={sessionPill.closingDeadline}
              />
            )}
          </span>
        )}
      </div>
      <div className={styles.right}>
        {extraRight}
        <span>{subtitle}</span>
        {profileHref ? (
          <Link to={profileHref} className={styles.avatarLink} aria-label="My profile">
            {avatar}
          </Link>
        ) : (
          avatar
        )}
      </div>
    </div>
  );
}
