import { useEffect, useRef, useState } from "react";
import { IconCheck, IconChevronDown, IconSearch } from "../icons/Icons";
import styles from "./SearchableSelect.module.css";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  /** What the closed trigger shows for this option once selected — falls back to `label` when
   * omitted. Lets a list row split into a title + sublabel (e.g. course code + name) while the
   * trigger still shows both combined, matching what a native `<select>` used to display collapsed. */
  triggerLabel?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  noResultsLabel?: (query: string) => string;
}

/** Combobox for long option lists (courses, faculty, students) — a drop-in swap for a plain
 * `<select>` when the option count makes scanning without search impractical. Filters on
 * label + sublabel together (e.g. course code + name) so either one can be searched. */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  ariaLabel,
  noResultsLabel = (query) => `No results for "${query}"`,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      searchRef.current?.focus();
    }
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? null;
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => `${o.label} ${o.sublabel ?? ""}`.toLowerCase().includes(q)) : options;

  return (
    <div className={styles.field} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        data-open={open ? "true" : "false"}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? styles.value : styles.placeholder}>
          {selected ? (selected.triggerLabel ?? selected.label) : placeholder}
        </span>
        <IconChevronDown className={styles.chevron} />
      </button>
      {open && (
        <div className={styles.panel} role="listbox">
          <div className={styles.searchWrap}>
            <IconSearch className={styles.searchIcon} />
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.list}>
            {filtered.length > 0 ? (
              filtered.map((o) => (
                <div
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  className={styles.row}
                  data-selected={o.value === value ? "true" : "false"}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <span className={styles.rowName}>
                    <span className={styles.rowTitle}>{o.label}</span>
                    {o.sublabel && <span className={styles.rowSub}>{o.sublabel}</span>}
                  </span>
                  {o.value === value && <IconCheck className={styles.check} />}
                </div>
              ))
            ) : (
              <div className={styles.empty}>
                <IconSearch className={styles.emptyIcon} />
                <span>{noResultsLabel(query)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
