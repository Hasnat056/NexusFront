import { Link } from "react-router-dom";
import { IconHome } from "../icons/Icons";
import styles from "./Breadcrumbs.module.css";

export interface BreadcrumbItem {
  label: string;
  /** Omit on the current page — it renders as a non-interactive pill instead of a link. */
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/** Replaces the old single-level "← Back to X" link with a real trail: role home → section →
 * record → sub-page. The first item always gets the home glyph — every trail in this app starts
 * at the current role's dashboard. */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className={styles.wrap} aria-label="Breadcrumb">
      <ol className={styles.trail}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.label} className={styles.item}>
              {item.href && !isLast ? (
                <Link to={item.href} className={styles.link}>
                  {i === 0 && <IconHome className={styles.homeIcon} />}
                  {item.label}
                </Link>
              ) : (
                <span className={styles.current}>{item.label}</span>
              )}
              {!isLast && <span className={styles.sep} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
