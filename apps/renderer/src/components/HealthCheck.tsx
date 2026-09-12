import { useEffect, useState } from 'react';
import type { PingResult } from '@pharmacy/shared';
import { ar } from '../i18n/ar';

type State =
  | { status: 'loading' }
  | { status: 'ok'; result: PingResult }
  | { status: 'error'; message: string };

/** M0 round-trip check: renderer → preload → main → utilityProcess → SQLite. */
export function HealthCheck() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
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
        <h2>{ar.status.connectionFailed}</h2>
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
