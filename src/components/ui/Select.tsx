import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  /** Richer visual override for both the row and (unless triggerLabel is set) the closed trigger —
   * e.g. a colored dot between two pieces of text instead of a plain separator character. `label`
   * stays the plain-text version used for search matching, so this is purely cosmetic. */
  labelNode?: ReactNode;
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
const PREFERRED_MAX_HEIGHT = 280;
const TRIGGER_GAP = 6;
const VIEWPORT_MARGIN = 8;

interface MenuRect {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

/** Below the trigger by default; flips above it when there's less than PREFERRED_MAX_HEIGHT of
 * room below and more room above — e.g. a dropdown opened near the bottom of the page. Either way
 * the panel is capped to whatever space is actually available on its chosen side, with the option
 * list scrolling internally (see .list in Select.module.css) rather than running off-screen. */
function computeMenuRect(triggerRect: DOMRect): MenuRect {
  const spaceBelow = window.innerHeight - triggerRect.bottom - TRIGGER_GAP - VIEWPORT_MARGIN;
  const spaceAbove = triggerRect.top - TRIGGER_GAP - VIEWPORT_MARGIN;
  const placeAbove = spaceBelow < PREFERRED_MAX_HEIGHT && spaceAbove > spaceBelow;
  const maxHeight = Math.max(120, Math.min(PREFERRED_MAX_HEIGHT, placeAbove ? spaceAbove : spaceBelow));
  return {
    left: triggerRect.left,
    width: triggerRect.width,
    maxHeight,
    ...(placeAbove
      ? { bottom: window.innerHeight - triggerRect.top + TRIGGER_GAP }
      : { top: triggerRect.bottom + TRIGGER_GAP }),
  };
}

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
  const [menuRect, setMenuRect] = useState<MenuRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchable = options.length > searchThreshold;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
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

  // The dropdown panel is portaled to <body> (see below) so it can never be clipped by an
  // ancestor's overflow:hidden — Panel.module.css's .panel uses that to keep e.g. table rows from
  // bleeding past its rounded corners, which was cutting this menu off right under the search box
  // whenever a Select sat inside a <Panel>. Being in the body means it also needs its own explicit
  // fixed-position coordinates, tracked here and kept in sync while open.
  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setMenuRect(computeMenuRect(rect));
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
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
          {selected ? (selected.triggerLabel ?? selected.labelNode ?? selected.label) : placeholder}
        </span>
        <IconChevronDown className={styles.chevron} />
      </button>
      {open &&
        menuRect &&
        createPortal(
          <div
            ref={panelRef}
            className={styles.panel}
            role="listbox"
            style={{
              position: "fixed",
              top: menuRect.top,
              bottom: menuRect.bottom,
              left: menuRect.left,
              width: menuRect.width,
              maxHeight: menuRect.maxHeight,
            }}
          >
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
                      <span className={styles.rowTitle}>{o.labelNode ?? o.label}</span>
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
          </div>,
          document.body,
        )}
    </div>
  );
}
