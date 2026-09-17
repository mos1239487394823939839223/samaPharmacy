import { useEffect, useState } from 'react';
import { DRAWER_TREE, type DrawerNode, type ScreenId } from '../lib/navigation';
import { ar } from '../i18n/ar';
import { ChevronDownIcon } from './icons';

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
          className={active ? 'sidebar__leaf sidebar__leaf--active' : 'sidebar__leaf'}
          onClick={() => node.screen && onNavigate(node.screen)}
        >
          <span className="sidebar__leaf-dot" aria-hidden="true" />
          {node.label}
        </button>
      </li>
    );
  }

  // Purely user-controlled: a group can be collapsed even while it holds the
  // active screen, so staff can tuck a section away without losing their
  // place — the active leaf stays highlighted once the group reopens.
  const isCollapsed = collapsed.has(node.label);

  return (
    <li>
      <button
        type="button"
        className="sidebar__group"
        onClick={() => onToggle(node.label)}
        aria-expanded={!isCollapsed}
      >
        <span>{node.label}</span>
        <span
          className={
            isCollapsed ? 'sidebar__group-chevron sidebar__group-chevron--collapsed' : 'sidebar__group-chevron'
          }
          aria-hidden="true"
        >
          <ChevronDownIcon />
        </span>
      </button>
      <div className={isCollapsed ? 'sidebar__children-wrap sidebar__children-wrap--collapsed' : 'sidebar__children-wrap'}>
        <div className="sidebar__children-inner">
          <ul className="sidebar__children">
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

/** Collapsible sidebar — the navigation tree, single source for every screen. */
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
    <aside className="sidebar">
      <button
        type="button"
        className={activeScreen === 'dashboard' ? 'sidebar__root sidebar__root--active' : 'sidebar__root'}
        onClick={() => onNavigate('dashboard')}
      >
        {ar.drawer.home}
      </button>

      <ul className="sidebar__tree">
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
