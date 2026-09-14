import { useEffect, useState } from 'react';
import { DRAWER_TREE, type DrawerNode, type ScreenId } from '../lib/navigation';
import { ar } from '../i18n/ar';

interface Props {
  open: boolean;
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

const COLLAPSED_KEY = 'ui.drawerCollapsedGroups';

function readCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** True if any leaf under this group is the active screen. */
function containsActive(node: DrawerNode, activeScreen: ScreenId): boolean {
  if (node.screen === activeScreen) return true;
  return node.children?.some((child) => containsActive(child, activeScreen)) ?? false;
}

function Node({
  node,
  activeScreen,
  onNavigate,
  collapsed,
  onToggle,
}: {
  node: DrawerNode;
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
  collapsed: Set<string>;
  onToggle: (label: string) => void;
}) {
  if (!node.children) {
    const active = node.screen === activeScreen;
    return (
      <li>
        <button
          type="button"
          className={active ? 'drawer__leaf drawer__leaf--active' : 'drawer__leaf'}
          onClick={() => node.screen && onNavigate(node.screen)}
        >
          {node.label}
        </button>
      </li>
    );
  }

  // A group holding the active screen never renders collapsed, even if the
  // user collapsed it earlier — otherwise the drawer would silently hide
  // where you currently are.
  const isCollapsed = collapsed.has(node.label) && !containsActive(node, activeScreen);

  return (
    <li>
      <button
        type="button"
        className="drawer__group"
        onClick={() => onToggle(node.label)}
        aria-expanded={!isCollapsed}
      >
        <span>{node.label}</span>
        <span
          className={
            isCollapsed ? 'drawer__group-chevron drawer__group-chevron--collapsed' : 'drawer__group-chevron'
          }
          aria-hidden="true"
        >
          <svg viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <div className={isCollapsed ? 'drawer__children-wrap drawer__children-wrap--collapsed' : 'drawer__children-wrap'}>
        <div className="drawer__children-inner">
          <ul className="drawer__children">
            {node.children.map((child) => (
              <Node
                key={child.label + (child.screen ?? '')}
                node={child}
                activeScreen={activeScreen}
                onNavigate={onNavigate}
                collapsed={collapsed}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

/** Collapsible side drawer — blueprint §1.1 tree. */
export function Drawer({ open, activeScreen, onNavigate }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => readCollapsed());

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
    } catch {
      /* private mode or blocked storage — collapse state just resets next launch */
    }
  }, [collapsed]);

  if (!open) return null;

  function toggle(label: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <aside className="drawer">
      <button
        type="button"
        className={activeScreen === 'health' ? 'drawer__root drawer__root--active' : 'drawer__root'}
        onClick={() => onNavigate('health')}
      >
        {ar.drawer.home}
      </button>
      <ul className="drawer__tree">
        {DRAWER_TREE.map((node) => (
          <Node
            key={node.label}
            node={node}
            activeScreen={activeScreen}
            onNavigate={onNavigate}
            collapsed={collapsed}
            onToggle={toggle}
          />
        ))}
      </ul>
    </aside>
  );
}
