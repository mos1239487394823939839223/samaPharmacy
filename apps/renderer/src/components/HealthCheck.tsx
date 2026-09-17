import { useEffect, useState } from 'react';
import type { PingResult } from '@pharmacy/shared';
import { ar } from '../i18n/ar';
import { AlertCircleIcon } from './icons';

type State =
  | { status: 'loading' }
  | { status: 'ok'; result: PingResult }
  | { status: 'error'; message: string };

/** M0 round-trip check: renderer → preload → main → utilityProcess → SQLite. */
export function HealthCheck() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    // window.api is injected by the preload script, which only runs inside
    // Electron. Opening the Vite dev URL in an ordinary browser leaves it
    // undefined; report that instead of throwing out of the effect and taking
    // the whole React tree down with it.
    if (!window.api) {
      setState({ status: 'error', message: ar.status.noBridge });
      return;
    }

    window.api
      .ping()
      .then((result) => setState({ status: 'ok', result }))
      .catch((err: Error) => setState({ status: 'error', message: err.message }));
  }, []);

  if (state.status === 'loading') {
    return <p className="muted">{ar.status.connecting}</p>;
  }

  if (state.status === 'error') {
    return (
      <div className="card error">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <AlertCircleIcon className="icon--sm" style={{ color: 'var(--error-500)' }} />
          {ar.status.connectionFailed}
        </h2>
        <pre>{state.message}</pre>
      </div>
    );
  }

  const { result } = state;

  return (
    <div className="card">
      <h2>{ar.status.connectionOk}</h2>
      <dl>
        <dt>{ar.status.sqliteVersion}</dt>
        <dd dir="ltr">{result.sqliteVersion}</dd>

        <dt>{ar.status.migrations}</dt>
        <dd dir="ltr">{result.migrations.join(', ') || '—'}</dd>

        <dt>{ar.status.journalMode}</dt>
        <dd dir="ltr">{result.journalMode}</dd>

        <dt>{ar.status.foreignKeys}</dt>
        <dd>{result.foreignKeys ? ar.status.enabled : ar.status.disabled}</dd>

        <dt>{ar.status.databasePath}</dt>
        <dd dir="ltr" className="path">
          {result.databasePath}
        </dd>
      </dl>
    </div>
  );
}
