/**
 * M0 health check.
 *
 * Proves the full round trip: renderer → preload bridge → main → utilityProcess
 * → SQLite and back. Replaced by the application shell at M2.
 */

import { useEffect, useState } from 'react';
import type { PingResult, RendererApi } from '@pharmacy/shared';

declare global {
  interface Window {
    api: RendererApi;
  }
}

type State =
  | { status: 'loading' }
  | { status: 'ok'; result: PingResult }
  | { status: 'error'; message: string };

export function App() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    window.api
      .ping()
      .then((result) => setState({ status: 'ok', result }))
      .catch((err: Error) => setState({ status: 'error', message: err.message }));
  }, []);

  return (
    <main className="health">
      <h1>نظام إدارة الصيدلية</h1>

      {state.status === 'loading' && <p className="muted">جارٍ الاتصال بقاعدة البيانات…</p>}

      {state.status === 'error' && (
        <div className="card error">
          <h2>فشل الاتصال</h2>
          <pre>{state.message}</pre>
        </div>
      )}

      {state.status === 'ok' && (
        <div className="card">
          <h2>الاتصال سليم</h2>
          <dl>
            <dt>إصدار SQLite</dt>
            <dd dir="ltr">{state.result.sqliteVersion}</dd>

            <dt>الترحيلات المطبقة</dt>
            <dd dir="ltr">{state.result.migrations.join(', ') || '—'}</dd>

            <dt>وضع السجل</dt>
            <dd dir="ltr">{state.result.journalMode}</dd>

            <dt>المفاتيح الخارجية</dt>
            <dd>{state.result.foreignKeys ? 'مفعّلة' : 'معطّلة'}</dd>

            <dt>مسار قاعدة البيانات</dt>
            <dd dir="ltr" className="path">
              {state.result.databasePath}
            </dd>
          </dl>
        </div>
      )}
    </main>
  );
}
