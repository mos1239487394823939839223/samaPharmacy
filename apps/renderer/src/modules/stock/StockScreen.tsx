/**
 * Stock view by item and batch — build order screen 7.
 *
 * Read-only: this screen never writes. Every quantity shown comes from
 * batches populated by a purchase, sale, return, or adjustment transaction
 * elsewhere, each of which writes its own stock_moves row (rule 8).
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemStockRow, BatchRow, StockMoveRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';

type MoveTypeKey = keyof typeof ar.stock.moveType;

export function StockScreen() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ItemStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ItemStockRow | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  async function load(q: string) {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await window.api.stock.search(q, 200));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load('');
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(query), 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  if (selected) {
    return (
      <BatchDetail
        item={selected}
        onBack={() => {
          setSelected(null);
          void load(query);
        }}
      />
    );
  }

  return (
    <div className="items">
      <div className="items__bar">
        <input
          className="field items__search"
          placeholder={ar.stock.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <p className="muted">{ar.items.loading}</p>
      ) : rows.length === 0 ? (
        <p className="muted">{query.trim() ? ar.stock.noResults : ar.stock.empty}</p>
      ) : (
        <table className="datatable">
          <thead>
            <tr>
              <th>{ar.items.fields.code}</th>
              <th>{ar.items.fields.nameAr}</th>
              <th>{ar.stock.onHand}</th>
              <th>{ar.stock.nearestExpiry}</th>
              <th>{ar.stock.stockValue}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.itemId} onDoubleClick={() => setSelected(r)}>
                <td dir="ltr">{r.code}</td>
                <td>{r.nameAr}</td>
                <td dir="ltr">{r.qtyOnHand}</td>
                <td dir="ltr">{r.nearestExpiry ?? ar.stock.noExpiry}</td>
                <td dir="ltr">{fromPiastres(r.stockValue)}</td>
                <td className="datatable__actions">
                  <button type="button" className="btn btn--sm" onClick={() => setSelected(r)}>
                    {ar.stock.batches}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BatchDetail({ item, onBack }: { item: ItemStockRow; onBack: () => void }) {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [movesFor, setMovesFor] = useState<number | null>(null);
  const [moves, setMoves] = useState<StockMoveRow[]>([]);
  const [ledgerCheck, setLedgerCheck] = useState<{ matches: boolean } | null>(null);

  useEffect(() => {
    if (!window.api) return;
    setLoading(true);
    void window.api.stock.batches(item.itemId).then((b) => {
      setBatches(b);
      setLoading(false);
    });
  }, [item.itemId]);

  async function showMoves(batch: BatchRow) {
    if (!window.api) return;
    setMovesFor(batch.id);
    setLedgerCheck(null);
    const list = await window.api.stock.batchMoves(batch.id);
    setMoves(list);
    const sum = list.reduce((s, m) => s + m.qtyDelta, 0);
    setLedgerCheck({ matches: sum === batch.qtyOnHand });
  }

  return (
    <div className="items">
      <div className="items__bar">
        <button type="button" className="btn" onClick={onBack}>
          {ar.stock.back}
        </button>
        <h2 className="section-heading section-heading--inline">{item.nameAr}</h2>
      </div>

      {loading ? (
        <p className="muted">{ar.items.loading}</p>
      ) : batches.length === 0 ? (
        <p className="muted">{ar.stock.noBatches}</p>
      ) : (
        <table className="datatable">
          <thead>
            <tr>
              <th>{ar.stock.batchNumber}</th>
              <th>{ar.stock.expiryDate}</th>
              <th>{ar.stock.onHand}</th>
              <th>{ar.stock.unitCost}</th>
              <th>{ar.stock.receivedAt}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td dir="ltr">{b.batchNumber ?? '—'}</td>
                <td dir="ltr">{b.expiryDate ?? ar.stock.noExpiry}</td>
                <td dir="ltr">
                  {b.qtyOnHand}
                  {Boolean(b.isQuarantined) && <span className="badge badge--muted"> {ar.stock.quarantined}</span>}
                </td>
                <td dir="ltr">{fromPiastres(b.unitCost)}</td>
                <td dir="ltr">{b.receivedAt.slice(0, 10)}</td>
                <td className="datatable__actions">
                  <button type="button" className="btn btn--sm" onClick={() => void showMoves(b)}>
                    {ar.stock.moves}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {movesFor !== null && (
        <fieldset className="fieldset">
          <legend>{ar.stock.moves}</legend>
          {ledgerCheck && (
            <p className={ledgerCheck.matches ? 'hint' : 'alert alert--error'}>
              {ledgerCheck.matches ? ar.stock.ledgerMatches : ar.stock.ledgerMismatch}
            </p>
          )}
          <table className="subtable">
            <thead>
              <tr>
                <th>{ar.purchases.invoiceDate}</th>
                <th>نوع الحركة</th>
                <th>الكمية</th>
                <th>{ar.stock.unitCost}</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td dir="ltr">{m.at.slice(0, 16)}</td>
                  <td>{ar.stock.moveType[m.moveType as MoveTypeKey] ?? m.moveType}</td>
                  <td dir="ltr">{m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}</td>
                  <td dir="ltr">{fromPiastres(m.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
      )}
    </div>
  );
}
