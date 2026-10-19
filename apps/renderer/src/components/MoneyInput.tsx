/**
 * Money field.
 *
 * Holds the raw text while the user types and converts to integer piastres on
 * every valid keystroke (rule 1). The component never does float arithmetic —
 * conversion goes through packages/core.
 */

import { useEffect, useState } from 'react';
import { fromPiastres, toPiastres } from '@pharmacy/core';
import { ar } from '../i18n/ar';

interface Props {
  value: number | null;
  onChange: (piastres: number | null) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Only balances may go below zero; prices and payments never do. */
  allowNegative?: boolean;
}

export function MoneyInput({ value, onChange, id, placeholder, disabled, allowNegative = false }: Props) {
  const [text, setText] = useState(() => (value === null ? '' : fromPiastres(value)));
  const [invalid, setInvalid] = useState(false);

  // Re-sync when the value changes from outside (e.g. loading an item to edit),
  // but not while the user is mid-edit on an equivalent value.
  useEffect(() => {
    const current = text.trim() === '' ? null : safeParse(text);
    if (current !== value) {
      setText(value === null ? '' : fromPiastres(value));
      setInvalid(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function safeParse(raw: string): number | null {
    try {
      const p = toPiastres(raw);
      return p < 0 && !allowNegative ? null : p;
    } catch {
      return null;
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      dir="ltr"
      className={invalid ? 'field field--invalid' : 'field'}
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);

        if (raw.trim() === '') {
          setInvalid(false);
          onChange(null);
          return;
        }

        const parsed = safeParse(raw);
        setInvalid(parsed === null);
        if (parsed !== null) onChange(parsed);
      }}
      title={invalid ? ar.common.invalidMoney : undefined}
      onBlur={() => {
        // Normalize the display on blur so "5" becomes "5.00". Invalid text
        // falls back to the value the form actually holds — otherwise the
        // field showed "10.555" while 10.55 (or an older number) was saved.
        setText(value === null ? '' : fromPiastres(value));
        setInvalid(false);
      }}
    />
  );
}
