import type { ComponentType, SVGProps } from "react";
import { Link } from "react-router-dom";
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
  avatarInitials: string;
  homeHref: string;
}

export function Rail({ items, activeId, avatarInitials, homeHref }: RailProps) {
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
            title={`${item.label} — coming soon`}
          >
            {content}
          </span>
        );
      })}
      <div className={styles.spacer} />
      <div className={styles.avatar}>{avatarInitials}</div>
    </aside>
  );
}
