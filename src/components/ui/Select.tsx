import { useEffect, useRef, useState } from "react";
import { IconCheck, IconChevronDown, IconSearch } from "../icons/Icons";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  /** What the closed trigger shows for this option once selected — falls back to `label` when
   * omitted. Lets a list row split into a title + sublabel (e.g. course code + name) while the
   * trigger still shows both combined, matching what a native `<select>` used to display collapsed. */
  triggerLabel?: string;
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** Mirrors the native `<select>`'s participation in the app's `.field[data-invalid="true"]`
   * error-border convention (Form.module.css) — that rule targets `select`, which this component's
   * `<button>` trigger doesn't match, so callers pass this explicitly instead. */
  invalid?: boolean;
  searchPlaceholder?: string;
  noResultsLabel?: (query: string) => string;
  /** Shows the search box only once there are more than this many options — below that, scanning
   * beats typing. Matches this app's standard dropdown threshold; only override for a page-specific
   * reason. */
  searchThreshold?: number;
}

const DEFAULT_SEARCH_THRESHOLD = 10;

/**
 * The app's one styled dropdown, a drop-in swap for a plain `<select>`. Search is shown or hidden
 * automatically based on option count (searchThreshold, default 10) rather than being something
 * each call site decides — that way a list that grows past the threshold over time (more faculty,
 * more courses) gets search without anyone having to notice and switch components.
 */
export function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  disabled = false,
  invalid = false,
  searchPlaceholder = "Search…",
  noResultsLabel = (query) => `No results for "${query}"`,
  searchThreshold = DEFAULT_SEARCH_THRESHOLD,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchable = options.length > searchThreshold;

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
    if (open && searchable) {
      setQuery("");
      searchRef.current?.focus();
    }
  }, [open, searchable]);

  const selected = options.find((o) => o.value === value) ?? null;
  const q = query.trim().toLowerCase();
  const filtered = searchable && q ? options.filter((o) => `${o.label} ${o.sublabel ?? ""}`.toLowerCase().includes(q)) : options;

  return (
    <div className={styles.field} ref={rootRef}>
      <button
        id={id}
        type="button"
        className={styles.trigger}
        data-open={open ? "true" : "false"}
        data-invalid={invalid ? "true" : "false"}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected ? styles.value : styles.placeholder}>
          {selected ? (selected.triggerLabel ?? selected.label) : placeholder}
        </span>
        <IconChevronDown className={styles.chevron} />
      </button>
      {open && (
        <div className={styles.panel} role="listbox">
          {searchable && (
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
          )}
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
