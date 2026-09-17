import type { ReactNode } from 'react';
import { InboxIcon } from './icons';

interface Props {
  title: string;
  hint?: string;
  action?: ReactNode;
}

/** Polished stand-in for an empty list/table, replacing a bare muted line. */
export function EmptyState({ title, hint, action }: Props) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <InboxIcon className="icon--lg" />
      </span>
      <p className="empty-state__title">{title}</p>
      {hint && <p className="empty-state__hint">{hint}</p>}
      {action}
    </div>
  );
}

/** Skeleton rows standing in for a table mid-fetch. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skeleton-table__row" key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <span className="skeleton skeleton-table__cell" key={c} />
          ))}
        </div>
      ))}
    </div>
  );
}
