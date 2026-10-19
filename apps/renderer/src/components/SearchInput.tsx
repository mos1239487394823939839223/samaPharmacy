/**
 * A search box with a clear (×) button.
 *
 * Drop-in for `<input>`: it takes the same props, and clearing goes through
 * the input's native value setter plus an `input` event — so the screen's own
 * onChange runs exactly as if the text had been deleted by hand, with no
 * second "onClear" path to wire on every screen. Focus returns to the box so
 * the next search (or scan) can follow straight away.
 */

import { forwardRef, useImperativeHandle, useRef, type InputHTMLAttributes } from 'react';
import { ar } from '../i18n/ar';

export const SearchInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function SearchInput(
  { className, style, ...props },
  ref
) {
  const inner = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inner.current!, []);
  const hasText = String(props.value ?? '').length > 0;

  function clear() {
    const el = inner.current;
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, '');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  }

  return (
    <span className="search-input" style={style}>
      <input ref={inner} type="text" className={className} {...props} />
      {hasText && !props.disabled && !props.readOnly && (
        <button
          type="button"
          className="search-input__clear"
          onClick={clear}
          // Keep focus in the box: mousedown would blur it before the click.
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
          title={ar.common.clearSearch}
          aria-label={ar.common.clearSearch}
        >
          ×
        </button>
      )}
    </span>
  );
});
