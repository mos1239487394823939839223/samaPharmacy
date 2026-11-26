/**
 * Expiry field typed the way it is printed on the box: "12/27" (→ end of
 * that month) or a full "15/12/2027". A plain text input — the native date
 * picker needs arrow keys between day/month/year segments, which breaks the
 * type-and-Enter rhythm of a purchase line.
 *
 * Calls onChange on every keystroke with the ISO date, or '' while the text
 * is not a date yet. Enter handlers that may run before the state lands can
 * read the raw text and call parseExpiry() themselves.
 */

import { useEffect, useState } from 'react';
import { formatExpiry, parseExpiry } from '@pharmacy/core';
import { ar } from '../i18n/ar';

interface Props {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  /** Marks the input for keyboard-flow focus (data-field). */
  field?: string;
}

export function ExpiryInput({ value, onChange, disabled, field }: Props) {
  const [text, setText] = useState(() => (value ? formatExpiry(value) : ''));
  // Red only once the pharmacist has left the field: "1" or "12/2" are not
  // mistakes, just a date halfway typed.
  const [touched, setTouched] = useState(false);

  // Re-sync when the value changes from outside, not while typing an equivalent date.
  useEffect(() => {
    if ((parseExpiry(text) ?? '') !== value) setText(value ? formatExpiry(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const invalid = touched && text.trim() !== '' && parseExpiry(text) === null;

  return (
    <input
      className={invalid ? 'field field--invalid' : 'field'}
      type="text"
      inputMode="numeric"
      dir="ltr"
      autoComplete="off"
      data-field={field}
      disabled={disabled}
      placeholder={ar.common.expiryPlaceholder}
      title={invalid ? ar.common.invalidExpiry : undefined}
      value={disabled ? '' : text}
      onChange={(e) => {
        setTouched(false);
        setText(e.target.value);
        onChange(parseExpiry(e.target.value) ?? '');
      }}
      onBlur={() => {
        setTouched(true);
        if (value) setText(formatExpiry(value));
      }}
    />
  );
}
