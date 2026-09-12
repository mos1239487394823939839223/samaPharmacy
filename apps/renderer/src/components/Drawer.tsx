import { DRAWER_TREE, type DrawerNode, type ScreenId } from '../lib/navigation';
import { ar } from '../i18n/ar';

interface Props {
  open: boolean;
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

function Node({
  node,
  activeScreen,
  onNavigate,
}: {
  node: DrawerNode;
  activeScreen: ScreenId;
  onNavigate: (s: ScreenId) => void;
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

  return (
    <li>
      <div className="drawer__group">{node.label}</div>
      <ul className="drawer__children">
        {node.children.map((child) => (
          <Node
            key={child.label + (child.screen ?? '')}
            node={child}
            activeScreen={activeScreen}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </li>
  );
}

/** Collapsible side drawer — blueprint §1.1 tree. */
export function Drawer({ open, activeScreen, onNavigate }: Props) {
  if (!open) return null;

  return (
    <aside className="drawer">
      <div className="drawer__root">{ar.drawer.home}</div>
      <ul className="drawer__tree">
        {DRAWER_TREE.map((node) => (
          <Node
            key={node.label}
            node={node}
            activeScreen={activeScreen}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </aside>
  );
}
