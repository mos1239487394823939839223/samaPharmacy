/**
 * One submission at a time. A double-click on «حفظ» used to create the
 * record twice (a duplicate supplier, a cash movement recorded twice) — the
 * ref blocks the second call before React has re-rendered the disabled
 * button.
 */

import { useCallback, useRef, useState } from 'react';

export function useBusy() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (work: () => Promise<unknown>): Promise<void> => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await work();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  return { busy, run };
}
