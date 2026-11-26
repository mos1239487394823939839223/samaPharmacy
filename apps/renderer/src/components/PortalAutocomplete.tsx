/**
 * Autocomplete dropdown rendered via a portal into document.body, positioned
 * with `position: fixed` computed from the anchor input's own bounding box.
 *
 * Exists specifically for inputs that live inside a horizontally-scrolling
 * container (the purchase/sales line-item grids): a plain `position:
 * absolute` dropdown is clipped by that container's `overflow-x: auto` —
 * setting overflow on one axis forces the other axis to clip too (CSS has
 * no way to scroll x while staying visible on y), so a normal dropdown
 * renders with real matching results but is invisible, which reads to a
 * pharmacist as "the search doesn't find anything" even though it does.
 * Escaping to body via a portal sidesteps every ancestor's overflow/
 * stacking context entirely.
 */

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props<T> {
  anchorRef: React.RefObject<HTMLElement>;
  items: T[];
  getKey: (item: T) => string | number;
  onSelect: (item: T) => void;
  children: (item: T) => React.ReactNode;
  /** Floor width in pixels, independent of the anchor's own width — a
      narrow grid column (e.g. the purchase-line item cell) is nowhere near
      wide enough to show a real drug name on one line, so the dropdown
      needs its own comfortable minimum rather than inheriting the column's
      width. Defaults to a size that fits typical Arabic drug names
      (strength, form, pack size) without wrapping. */
  minWidth?: number;
  /** Row highlighted by the keyboard (↑/↓ on the anchor input). */
  activeIndex?: number;
  /** Extra action under the results (e.g. «+ صنف جديد»); shown even with no results. */
  footer?: { label: string; onClick: () => void } | null;
}

const DEFAULT_MIN_WIDTH = 360;
// Gap kept clear from the viewport edge so the dropdown never touches it.
const VIEWPORT_MARGIN = 12;

export function PortalAutocomplete<T>({
  anchorRef,
  items,
  getKey,
  onSelect,
  children,
  minWidth = DEFAULT_MIN_WIDTH,
  activeIndex = -1,
  footer = null,
}: Props<T>) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const width = Math.max(r.width, minWidth);
      // Anchored to the input's start edge (RTL: its right edge), same as
      // the in-flow autocomplete it replaces — but if the wider dropdown
      // would then run past the viewport's own edge, pull it back just
      // enough to stay fully on screen instead of clipping off the window.
      const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
      const left = Math.min(r.left, Math.max(maxLeft, VIEWPORT_MARGIN));
      setRect({ top: r.bottom + 4, left, width });
    };
    update();
    // Anchor position shifts with the grid's own horizontal scroll and the
    // page's vertical scroll — both must reposition the dropdown live, or
    // it visibly detaches from its input the moment either one moves.
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchorRef, items.length, minWidth, Boolean(footer)]);

  if ((items.length === 0 && !footer) || !rect) return null;

  return createPortal(
    <ul
      className="autocomplete autocomplete--portal"
      style={{ top: rect.top, left: rect.left, width: rect.width }}
    >
      {items.map((item, i) => (
        <li key={getKey(item)}>
          <button
            type="button"
            className={i === activeIndex ? 'autocomplete__active' : undefined}
            // Keep focus in the input: the click must not blur it first.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(item)}
          >
            {children(item)}
          </button>
        </li>
      ))}
      {footer && (
        <li>
          <button type="button" className="autocomplete__new" onMouseDown={(e) => e.preventDefault()} onClick={footer.onClick}>
            {footer.label}
          </button>
        </li>
      )}
    </ul>,
    document.body
  );
}
