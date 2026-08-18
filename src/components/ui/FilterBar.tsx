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
  addLabel?: string;
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
  addLabel,
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
    </div>
  );
}
