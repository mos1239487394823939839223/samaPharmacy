/**
 * Data-entry help for every form in the app, installed once:
 *
 *  - Enter moves to the next field (like Tab), so a form is filled without
 *    the mouse. Screens that give Enter their own meaning (the till, invoice
 *    lines, search boxes) handle it first and call preventDefault — this
 *    only acts on an Enter nobody claimed. On the last field nothing is
 *    intercepted, so a form's own submit still happens there.
 *  - Focusing a number field selects its value: typing replaces "0" or the
 *    old quantity instead of appending to it.
 */

const FIELDS = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not(:disabled):not([readonly]), select:not(:disabled), textarea:not(:disabled)';

function visible(el: HTMLElement): boolean {
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.defaultPrevented || (e.code !== 'Enter' && e.code !== 'NumpadEnter')) return;
  if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
  const el = e.target as HTMLElement | null;
  if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
  if (el instanceof HTMLInputElement && ['checkbox', 'radio', 'button', 'submit'].includes(el.type)) return;
  // Searches and dialogs keep their own Enter (pick a result / submit).
  if (el.closest('.search-input, .modal-backdrop, [data-enter="own"]')) return;
  const page = el.closest('main.shell__content');
  if (!page) return;
  const scope = el.closest('form, .item-form, .panel, .fieldset, .pline, .unit-row') ?? page;
  const fields = [...scope.querySelectorAll<HTMLElement>(FIELDS)].filter(visible);
  const next = fields[fields.indexOf(el) + 1];
  if (!next) return;
  e.preventDefault();
  next.focus();
  if (next instanceof HTMLInputElement && next.type !== 'date') next.select();
}

function onFocusIn(e: FocusEvent): void {
  const el = e.target;
  if (!(el instanceof HTMLInputElement)) return;
  if (el.inputMode !== 'numeric' && el.inputMode !== 'decimal') return;
  // After the click has placed the caret, or the selection would be undone.
  requestAnimationFrame(() => {
    if (document.activeElement === el) el.select();
  });
}

let installed = false;
export function installInputAssist(): void {
  if (installed) return;
  installed = true;
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('focusin', onFocusIn);
}
