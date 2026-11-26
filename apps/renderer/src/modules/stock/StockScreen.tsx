/**
 * Stock view by item and batch — build order screen 7.
 *
 * Read-only: this screen never writes. Every quantity shown comes from
 * batches populated by a purchase, sale, return, or adjustment transaction
 * elsewhere, each of which writes its own stock_moves row (rule 8).
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemStockRow, BatchRow, StockMoveRow, Valuation, ValuationRow, WarehouseRow } from '@pharmacy/shared';
import { fromPiastres, fromPiastresGrouped } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { EmptyState, TableSkeleton } from '../../components/EmptyState';
import { errorText } from '../../lib/errors';
import { exportCsv } from '../../lib/csv';
import { useToast } from '../../components/Toast';
import { SearchInput } from '../../components/SearchInput';
import { useRefreshOnActivate } from '../../lib/workspace';

type MoveTypeKey = keyof typeof ar.stock.moveType;

export function StockScreen() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ItemStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ItemStockRow | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  // null = every warehouse combined — the qtyOnHand shown is then a sum
  // across all of them, same as before this filter existed.
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  // On by default: the shelf, not the 25,000-item catalogue.
  const [inStockOnly, setInStockOnly] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const { showToast } = useToast();
  // Value of the whole stock (not just the rows on screen) — actual vs expected.
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const byItem = new Map<number, ValuationRow>((valuation?.rows ?? []).map((r) => [r.itemId, r]));

  function loadValuation(wId: number | null) {
    void window.api?.valuation
      .get(wId)
      .then(setValuation)
      .catch(() => undefined);
  }
  useEffect(() => loadValuation(warehouseId), [warehouseId]);
  useRefreshOnActivate(() => {
    loadValuation(warehouseId);
    void load(query, warehouseId);
  });

  useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then(setWarehouses);
  }, []);

  async function load(q: string, wId: number | null) {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await window.api.stock.search(q, 200, wId ?? undefined, inStockOnly));
    } catch (err) {
      setError(`${ar.stock.errors.loadFailed}: ${errorText(err)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(query, warehouseId), 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, warehouseId, inStockOnly]);

  if (selected) {
    return (
      <BatchDetail
        item={selected}
        warehouses={warehouses}
        onBack={() => {
          setSelected(null);
          void load(query, warehouseId);
        }}
      />
    );
  }

  const tot = valuation?.totals;
  const fullValue = tot ? tot.costValue + tot.expiredCost + tot.quarantinedCost : 0;

  return (
    <div className="items">
      {tot && (
        <div className="stock-value">
          <div className="stock-value__cell">
            <span className="stock-value__label">{ar.stock.value.actual}</span>
            <span className="stock-value__num" dir="ltr">{fromPiastresGrouped(tot.costValue)}</span>
            <span className="stock-value__hint">{ar.stock.value.actualHint}</span>
          </div>
          <div className="stock-value__cell">
            <span className="stock-value__label">{ar.stock.value.expected}</span>
            <span className="stock-value__num" dir="ltr">{fromPiastresGrouped(tot.saleValue)}</span>
            <span className="stock-value__hint">{ar.stock.value.expectedHint}</span>
          </div>
          <div className={tot.profit >= 0 ? 'stock-value__cell stock-value__cell--good' : 'stock-value__cell stock-value__cell--bad'}>
            <span className="stock-value__label">{ar.stock.value.profit}</span>
            <span className="stock-value__num" dir="ltr">{fromPiastresGrouped(tot.profit)}</span>
            <span className="stock-value__hint">{ar.valuation.margin.replace('{pct}', String(tot.marginPct))}</span>
          </div>
          <div className="stock-value__cell stock-value__cell--total">
            <span className="stock-value__label">{ar.stock.value.full}</span>
            <span className="stock-value__num" dir="ltr">{fromPiastresGrouped(fullValue)}</span>
            <span className="stock-value__hint">
              {tot.expiredCost + tot.quarantinedCost > 0
                ? ar.stock.value.fullHint
                    .replace('{expired}', fromPiastres(tot.expiredCost))
                    .replace('{quarantined}', fromPiastres(tot.quarantinedCost))
                : ar.stock.value.fullHintClean}
            </span>
          </div>
        </div>
      )}
      {tot && tot.unpricedItems > 0 && (
        <p className="hint" style={{ margin: 0 }}>
          {ar.valuation.unpriced.replace('{n}', String(tot.unpricedItems)).replace('{cost}', `${fromPiastres(tot.unpricedCost)} ${ar.common.currency}`)}
        </p>
      )}
      <div className="items__bar">
        <SearchInput
          className="field items__search"
          placeholder={ar.stock.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {warehouses.length > 1 && (
          <select
            className="field field--sm"
            value={warehouseId ?? ''}
            onChange={(e) => setWarehouseId(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">{ar.stock.allWarehouses}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nameAr}
              </option>
            ))}
          </select>
        )}
        <label className="checkbox">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
          <span>{ar.stock.inStockOnly}</span>
        </label>
        <button
          type="button"
          className="btn btn--sm"
          disabled={rows.length === 0}
          onClick={() =>
            void exportCsv(
              'stock.csv',
              [ar.items.fields.code, ar.items.fields.nameAr, ar.stock.available, ar.stock.expiredQty, ar.stock.quarantinedQty, ar.stock.nearestExpiry,
                ar.stock.value.actual, ar.stock.value.expected, ar.stock.value.profit],
              rows.map((r) => {
                const v = byItem.get(r.itemId);
                return [r.code, r.nameAr, r.qtyOnHand, r.expiredQty, r.quarantinedQty, r.nearestExpiry ?? '', fromPiastres(r.stockValue),
                  v?.saleValue == null ? '' : fromPiastres(v.saleValue), v?.profit == null ? '' : fromPiastres(v.profit)];
              })
            ).then((msg) => msg && showToast(msg, 'info'))
          }
        >
          {ar.exportCsv.button}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <TableSkeleton cols={8} />
      ) : rows.length === 0 ? (
        <EmptyState title={query.trim() ? ar.stock.noResults : inStockOnly ? ar.stock.noStockYet : ar.stock.empty} />
      ) : (
        <div className="table-wrap"><table className="datatable">
          <thead>
            <tr>
              <th>{ar.items.fields.code}</th>
              <th>{ar.items.fields.nameAr}</th>
              <th>{ar.stock.available}</th>
              <th>{ar.stock.expiredQty}</th>
              <th>{ar.stock.quarantinedQty}</th>
              <th>{ar.stock.nearestExpiry}</th>
              <th>{ar.stock.value.actual}</th>
              <th>{ar.stock.value.expected}</th>
              <th>{ar.stock.value.profit}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.itemId} onDoubleClick={() => setSelected(r)}>
                <td dir="ltr">{r.code}</td>
                <td>{r.nameAr}</td>
                <td>
                  {r.qtyOnHand === 0 ? (
                    <span className="badge badge--error">{ar.stock.outOfStock}</span>
                  ) : (
                    <>
                      <span>{byItem.get(r.itemId)?.qtyText ?? r.qtyOnHand}</span>
                      <div className="muted small">= <span dir="ltr">{r.qtyOnHand}</span></div>
                    </>
                  )}
                </td>
                <td dir="ltr" className={r.expiredQty > 0 ? 'text-bad' : 'muted'}>{r.expiredQty || '—'}</td>
                <td dir="ltr" className="muted">{r.quarantinedQty || '—'}</td>
                <td dir="ltr">{r.nearestExpiry ?? ar.stock.noExpiry}</td>
                <td dir="ltr">{fromPiastresGrouped(r.stockValue)}</td>
                <td dir="ltr">
                  {r.qtyOnHand === 0 ? '—' : byItem.get(r.itemId)?.saleValue == null ? <span className="badge badge--warning">{ar.valuation.noPrice}</span> : fromPiastresGrouped(byItem.get(r.itemId)!.saleValue!)}
                </td>
                <td dir="ltr" className={(byItem.get(r.itemId)?.profit ?? 0) < 0 ? 'text-bad strong' : 'strong'}>
                  {byItem.get(r.itemId)?.profit == null ? '—' : fromPiastresGrouped(byItem.get(r.itemId)!.profit!)}
                </td>
                <td className="datatable__actions">
                  <button type="button" className="btn btn--sm" onClick={() => setSelected(r)}>
                    {ar.stock.batches}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}

function BatchDetail({
  item,
  warehouses,
  onBack,
}: {
  item: ItemStockRow;
  warehouses: WarehouseRow[];
  onBack: () => void;
}) {
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
        <TableSkeleton cols={6} />
      ) : batches.length === 0 ? (
        <EmptyState title={ar.stock.noBatches} />
      ) : (
        <div className="table-wrap"><table className="datatable">
          <thead>
            <tr>
              <th>{ar.stock.warehouseColumn}</th>
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
                <td>{warehouses.find((w) => w.id === b.warehouseId)?.nameAr ?? '—'}</td>
                <td dir="ltr">{b.batchNumber ?? '—'}</td>
                <td dir="ltr">{b.expiryDate ?? ar.stock.noExpiry}</td>
                <td dir="ltr">
                  {b.qtyOnHand}
                  {Boolean(b.isQuarantined) && <span className="badge badge--muted"> {ar.stock.quarantined}</span>}
                </td>
                <td dir="ltr">{fromPiastresGrouped(b.unitCost)}</td>
                <td dir="ltr">{b.receivedAt.slice(0, 10)}</td>
                <td className="datatable__actions">
                  <button type="button" className="btn btn--sm" onClick={() => void showMoves(b)}>
                    {ar.stock.moves}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {movesFor !== null && (
        <fieldset className="fieldset">
          <legend>{ar.stock.moves}</legend>
          {ledgerCheck && (
            <p className={ledgerCheck.matches ? 'hint' : 'alert alert--error'}>
              {ledgerCheck.matches ? ar.stock.ledgerMatches : ar.stock.ledgerMismatch}
            </p>
          )}
          <div className="table-wrap"><table className="subtable">
            <thead>
              <tr>
                <th>{ar.purchases.invoiceDate}</th>
                <th>{ar.stock.moveTypeLabel}</th>
                <th>{ar.stock.qtyDelta}</th>
                <th>{ar.stock.unitCost}</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td dir="ltr">{m.at.slice(0, 16)}</td>
                  <td>{ar.stock.moveType[m.moveType as MoveTypeKey] ?? m.moveType}</td>
                  <td dir="ltr">{m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}</td>
                  <td dir="ltr">{fromPiastresGrouped(m.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </fieldset>
      )}
    </div>
  );
}
