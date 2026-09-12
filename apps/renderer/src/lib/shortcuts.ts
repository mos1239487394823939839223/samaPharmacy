/**
 * Keyboard shortcut layer.
 *
 * Reads `event.code`, never `event.key` (CLAUDE.md rule 4). Under a Windows
 * Arabic input layout `.key` returns Arabic letters, so a `.key === 'n'` test
 * silently stops matching the moment staff switch layouts — the same class of
 * bug that makes scanned barcodes arrive as Arabic text.
 *
 * `code` is the physical key position and is layout-independent: KeyN is KeyN
 * in every layout.
 */

export interface Shortcut {
  /** KeyboardEvent.code, e.g. 'KeyN'. */
  code: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface ShortcutBinding extends Shortcut {
  id: string;
  run: () => void;
}

/** Human-readable label for a shortcut badge, e.g. "Ctrl+Shift+N". */
export function formatShortcut(s: Shortcut): string {
  const parts: string[] = [];
  if (s.ctrl) parts.push('Ctrl');
  if (s.shift) parts.push('Shift');
  if (s.alt) parts.push('Alt');

  let key = s.code;
  if (key.startsWith('Key')) key = key.slice(3);
  else if (key.startsWith('Digit')) key = key.slice(5);
  else if (key.startsWith('F') && /^F\d+$/.test(key)) {
    // already F1..F12
  }
  parts.push(key);

  return parts.join('+');
}

function matches(e: KeyboardEvent, s: Shortcut): boolean {
  return (
    e.code === s.code &&
    e.ctrlKey === Boolean(s.ctrl) &&
    e.shiftKey === Boolean(s.shift) &&
    e.altKey === Boolean(s.alt)
  );
}

/**
 * Attach shortcut bindings to the document.
 * Returns a detach function.
 */
export function attachShortcuts(bindings: ShortcutBinding[]): () => void {
  const handler = (e: KeyboardEvent) => {
    // Ignore IME composition — Arabic input goes through it.
    if (e.isComposing) return;

    for (const binding of bindings) {
      if (matches(e, binding)) {
        e.preventDefault();
        e.stopPropagation();
        binding.run();
        return;
      }
    }
  };

  document.addEventListener('keydown', handler, true);
  return () => document.removeEventListener('keydown', handler, true);
}
