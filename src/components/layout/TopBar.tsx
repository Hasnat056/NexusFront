import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./TopBar.module.css";

interface TopBarProps {
  title: string;
  sessionLabel?: string;
  subtitle: string;
  avatarInitials: string;
  avatarSrc?: string | null;
  extraRight?: ReactNode;
  profileHref?: string;
}

export function TopBar({ title, sessionLabel, subtitle, avatarInitials, avatarSrc, extraRight, profileHref }: TopBarProps) {
  const avatar = <div className={styles.avatar}>{avatarSrc ? <img src={avatarSrc} alt="" /> : avatarInitials}</div>;

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <h2 className={styles.title}>{title}</h2>
        {sessionLabel && (
          <span className={styles.sessionPill}>
            <span className={styles.dot} />
            {sessionLabel}
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
