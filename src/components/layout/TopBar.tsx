import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./TopBar.module.css";

interface TopBarProps {
  title: string;
  sessionLabel?: string;
  subtitle: string;
  avatarInitials: string;
  extraRight?: ReactNode;
  profileHref?: string;
}

export function TopBar({ title, sessionLabel, subtitle, avatarInitials, extraRight, profileHref }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function handleLogout() {
    setMenuOpen(false);
    navigate("/login");
  }

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
        <div className={styles.avatarMenu} ref={menuRef}>
          <button
            type="button"
            className={styles.avatarButton}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <div className={styles.avatar}>{avatarInitials}</div>
          </button>
          {menuOpen && (
            <div className={styles.menu} role="menu">
              {profileHref && (
                <Link to={profileHref} role="menuitem" className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                  My profile
                </Link>
              )}
              <button
                type="button"
                role="menuitem"
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
