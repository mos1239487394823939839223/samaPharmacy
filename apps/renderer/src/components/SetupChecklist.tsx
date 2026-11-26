/**
 * «ابدأ هنا» — the steps a new pharmacy needs before a normal day, checked
 * against the real data (not ticked by hand): the stock already on the
 * shelves and an open shift. A printer is optional — sales never need one. Each step opens the page that completes it. Hidden
 * once every step is done, or when dismissed.
 */

import { useEffect, useState } from 'react';
import type { ScreenId } from '../lib/navigation';
import { ar } from '../i18n/ar';
import { useRefreshOnActivate } from '../lib/workspace';

const t = ar.setup;
const HIDE_KEY = 'ui.setupHidden';

interface Step {
  id: string;
  done: boolean;
  screen: ScreenId;
}

export function SetupChecklist({ onNavigate }: { onNavigate: (s: ScreenId) => void }) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1';
    } catch {
      return false;
    }
  });

  async function load() {
    const api = window.api;
    if (!api) return;
    try {
      const [value, warehouses] = await Promise.all([api.valuation.get(null), api.warehouses.list()]);
      const wh = warehouses.find((w) => w.isDefault) ?? warehouses[0];
      const shift = wh ? await api.shifts.getOpen(wh.id) : null;
      setSteps([
        { id: 'stock', done: value.totals.items > 0, screen: 'items.opening' },
        { id: 'shift', done: Boolean(shift), screen: 'sales.shiftHandover' },
      ]);
    } catch {
      /* the checklist is a convenience — never block the home page */
    }
  }
  useEffect(() => void load(), []);
  useRefreshOnActivate(() => void load());

  if (hidden || !steps) return null;
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const nextStep = steps.find((s) => !s.done);

  return (
    <section className="setup" aria-label={t.title}>
      <div className="setup__head">
        <h2 className="setup__title">{t.title}</h2>
        <span className="setup__progress">
          {t.progress.replace('{done}', String(done)).replace('{total}', String(steps.length))}
          {' · '}
          <button
            type="button"
            className="link-button small"
            onClick={() => {
              setHidden(true);
              try {
                localStorage.setItem(HIDE_KEY, '1');
              } catch {
                /* not remembered — fine */
              }
            }}
          >
            {t.hide}
          </button>
        </span>
      </div>
      <div className="setup__bar" aria-hidden="true">
        <span style={{ inlineSize: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="setup__list">
        {steps.map((s) => {
          const text = (t.steps as Record<string, { label: string; desc: string; action: string }>)[s.id]!;
          return (
            <li key={s.id} className={s.done ? 'setup__step setup__step--done' : 'setup__step'}>
              <span className="setup__check" aria-hidden="true">
                {s.done ? '✓' : ''}
              </span>
              <span className="setup__body">
                <span className="setup__label">{text.label}</span>
                {!s.done && <div className="setup__desc">{text.desc}</div>}
              </span>
              {!s.done && (
                <button type="button" className={s === nextStep ? 'btn btn--primary btn--sm' : 'btn btn--sm'} onClick={() => onNavigate(s.screen)}>
                  {text.action}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
