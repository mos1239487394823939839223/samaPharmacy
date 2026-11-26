/**
 * Small inline icon set — stands in for a dedicated icon package. Every icon
 * shares Lucide's 24-viewbox/stroke contract (see `.icon` in styles.css) so
 * sizing and stroke weight stay uniform even though the paths are hand-picked
 * rather than pulled from a library.
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, className, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className ? `icon ${className}` : 'icon'} aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Base>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Base>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Base>
  );
}

export function PillIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="M8 8l8 8" />
    </Base>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </Base>
  );
}

export function AlertCircleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </Base>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 4v6h-6" />
    </Base>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 9l6 6 6-6" />
    </Base>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 2h12v19l-3-2-2 2-2-2-2 2-3-2Z" />
      <path d="M9 7h6M9 11h6" />
    </Base>
  );
}

export function TrendingUpIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 6h6v6" />
    </Base>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </Base>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </Base>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" />
      <path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-4a2 2 0 0 0 0 4h5" />
    </Base>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.2 2.2L16 9.5" />
    </Base>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Base>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </Base>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16.5 4.5c1.7.4 3 1.9 3 3.7 0 1.7-1.1 3.1-2.6 3.6" />
      <path d="M18 14c2.2.5 3.5 2 3.5 4.3" />
    </Base>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2 7h11v9H2z" />
      <path d="M13 10h4l4 3v3h-8z" />
      <circle cx="6.5" cy="18" r="1.7" />
      <circle cx="16.5" cy="18" r="1.7" />
    </Base>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
      <path d="M9.5 20v-6h5v6" />
    </Base>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Base>
  );
}

/* ---- Screen icons (sidebar) — Lucide-shaped, hand-drawn paths ---------- */

const icon = (paths: React.ReactNode) =>
  function ScreenIcon(props: IconProps) {
    return <Base {...props}>{paths}</Base>;
  };

export const CartIcon = icon(
  <>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2.5 3.5h2.6l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 7.5H6" />
  </>
);
export const HistoryIcon = icon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7.5V12l3 2" />
  </>
);
export const UndoIcon = icon(
  <>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </>
);
export const RedoIcon = icon(
  <>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </>
);
export const CashIcon = icon(
  <>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 10v4M18 10v4" />
  </>
);
export const ArrowsIcon = icon(
  <>
    <path d="M7 4 3 8l4 4" />
    <path d="M3 8h13" />
    <path d="m17 20 4-4-4-4" />
    <path d="M21 16H8" />
  </>
);
export const ListIcon = icon(
  <>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </>
);
export const AlertIcon = icon(
  <>
    <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </>
);
export const CalendarIcon = icon(
  <>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </>
);
export const ClipboardIcon = icon(
  <>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 2.5h6v3H9z" />
    <path d="m9 13 2 2 4-4" />
  </>
);
export const ShieldIcon = icon(
  <>
    <path d="M12 2.5 4 5.5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10v-6Z" />
    <path d="M12 8v6M9 11h6" />
  </>
);
export const CoinsIcon = icon(
  <>
    <ellipse cx="9" cy="6.5" rx="6" ry="3" />
    <path d="M3 6.5v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4" />
    <path d="M9 13.5v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.6-2.4-2.9-5.5-3" />
  </>
);
export const FileTextIcon = icon(
  <>
    <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2.5V8h5.5" />
    <path d="M8.5 13h7M8.5 17h5" />
  </>
);
export const ChartIcon = icon(
  <>
    <path d="M3 3v18h18" />
    <path d="M7 15v2M11.5 10v7M16 12.5V17M20.5 6v11" />
  </>
);
export const PrinterIcon = icon(
  <>
    <path d="M6.5 9V3h11v6" />
    <rect x="3" y="9" width="18" height="8" rx="2" />
    <path d="M6.5 14h11v7h-11z" />
  </>
);
export const DatabaseIcon = icon(
  <>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </>
);
export const TagIcon = icon(
  <>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.3" />
  </>
);
export const BuildingIcon = icon(
  <>
    <path d="M3 21h18" />
    <path d="M5 21V8l7-5 7 5v13" />
    <path d="M9.5 21v-5h5v5M9 11h.01M15 11h.01" />
  </>
);
export const SidebarIcon = icon(
  <>
    <rect x="3" y="3.5" width="18" height="17" rx="2" />
    <path d="M15 3.5v17" />
  </>
);
export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const XIcon = icon(<path d="M6 6l12 12M18 6 6 18" />);
