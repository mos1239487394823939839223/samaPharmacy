/**
 * Global toast notifications — replaces the inline `.alert--info` banner
 * pattern that most screens used to show a one-line success message at the
 * top of the page (pushing content down, requiring a manual × to dismiss).
 * A toast is fixed-position, animates in/out, and clears itself, so a
 * screen's "saved" feedback no longer competes for layout space with its
 * actual content.
 *
 * Usage: const { showToast } = useToast(); showToast(ar.cashInOut.cashIn);
 */

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-host" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.variant}`}>
            <span className="toast__icon" aria-hidden="true">
              {t.variant === 'success' ? '✓' : t.variant === 'error' ? '×' : 'ℹ'}
            </span>
            <span className="toast__message">{t.message}</span>
            <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="إغلاق">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
