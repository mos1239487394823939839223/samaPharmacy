/**
 * Keeps a rendering bug in one screen from blanking the whole window.
 * Saved data is never at risk here — every write is a committed transaction
 * in the db process — so the honest message is "reopen the screen".
 */

import { Component, type ReactNode } from 'react';
import { ar } from '../i18n/ar';

interface State {
  failed: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    console.error(error);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="panel stack">
        <h2>{ar.crash.title}</h2>
        <p className="muted">{ar.crash.body}</p>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => this.setState({ failed: false })}>
            {ar.crash.retry}
          </button>
        </div>
      </div>
    );
  }
}
