import type { ComponentType, SVGProps } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../lib/auth";
import { IconLogout } from "../icons/Icons";
import styles from "./Rail.module.css";

export interface RailNavItem {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href?: string;
}

interface RailProps {
  items: RailNavItem[];
  activeId: string;
  homeHref: string;
}

export function Rail({ items, activeId, homeHref }: RailProps) {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className={styles.rail}>
      <Link to={homeHref} className={styles.mark} aria-label="Nexus home">
        N
      </Link>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeId;
        const content = <Icon />;
        return item.href ? (
          <Link
            key={item.id}
            to={item.href}
            className={styles.item}
            data-active={isActive}
            aria-label={item.label}
            title={item.label}
          >
            {content}
          </Link>
        ) : (
          <span
            key={item.id}
            className={styles.item}
            data-active={isActive}
            aria-label={item.label}
            title={`${item.label} (coming soon)`}
          >
            {content}
          </span>
        );
      })}
      <div className={styles.spacer} />
      <button type="button" className={styles.logout} onClick={handleLogout} aria-label="Log out" title="Log out">
        <IconLogout />
      </button>
    </aside>
  );
}
