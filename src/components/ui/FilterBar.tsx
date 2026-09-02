import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "./FilterBar.module.css";

export interface FilterSelect {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  addHref?: string;
  /** Alternative to addHref for an "Add" trigger that opens an inline form in place rather than
   * navigating to a separate create page (e.g. SessionListPage's create-session row) — same slot,
   * same styling, just a button instead of a Link. Ignored if addHref is also set. */
  addOnClick?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: ReactNode;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  selects = [],
  addHref,
  addOnClick,
  addLabel,
  addDisabled,
  secondaryHref,
  secondaryLabel,
  children,
}: FilterBarProps) {
  return (
    <div className={styles.bar}>
      <input
        type="text"
        className={styles.search}
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {selects.map((select) => (
        <select
          key={select.id}
          className={styles.select}
          value={select.value}
          onChange={(e) => select.onChange(e.target.value)}
        >
          <option value="">{select.placeholder}</option>
          {select.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {children}
      <div className={styles.spacer} />
      {secondaryHref && (
        <Link to={secondaryHref} className={styles.secondaryButton}>
          {secondaryLabel ?? "Secondary action"}
        </Link>
      )}
      {addHref && (
        <Link to={addHref} className={styles.addButton}>
          {addLabel ?? "Add new"}
        </Link>
      )}
      {!addHref && addOnClick && (
        <button type="button" className={styles.addButton} onClick={addOnClick} disabled={addDisabled}>
          {addLabel ?? "Add new"}
        </button>
      )}
    </div>
  );
}
