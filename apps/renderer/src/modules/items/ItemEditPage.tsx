/**
 * تعديل صنف — an item's edit form on its own workspace page, opened from an
 * invoice, the items list or النواقص. Saving tells every open page the item
 * changed (the invoice refreshes its line) and returns to the page that
 * opened this one. The same item record is edited — never copied.
 */

import { useEffect, useState } from 'react';
import type { ItemDetail } from '@pharmacy/shared';
import { ar } from '../../i18n/ar';
import { ItemForm } from './ItemForm';
import { useWorkspace } from '../../lib/workspace';
import { emitItemUpdated } from '../../lib/itemEvents';
import { useToast } from '../../components/Toast';
import { errorText } from '../../lib/errors';
import { ShortageButton, useShortageItems } from '../../components/ShortageDialog';

export function ItemEditPage({ showBadges }: { showBadges: boolean }) {
  const { itemId, finish } = useWorkspace();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const listed = useShortageItems();

  useEffect(() => {
    if (itemId == null) return setError(ar.errors['item.notFound']);
    window
      .api!.items.get(itemId)
      .then((d) => (d ? setItem(d) : setError(ar.errors['item.notFound'])))
      .catch((err) => setError(errorText(err)));
  }, [itemId]);

  if (error) {
    return (
      <div className="stack">
        <div className="alert alert--error">{error}</div>
        <button type="button" className="btn" onClick={finish}>
          {ar.items.actions.back}
        </button>
      </div>
    );
  }
  if (!item) return <p className="muted">{ar.items.loading}</p>;

  return (
    <div className="stack">
      <div className="btn-row" style={{ marginBlockStart: 0 }}>
        <ShortageButton itemId={item.id} itemName={item.nameAr} listed={listed.has(item.id)} />
      </div>
      <ItemForm
        // Remount on a fresh load so the form starts from the saved values.
        key={item.id}
        existing={item}
        showBadges={showBadges}
        onSaved={() => {
          emitItemUpdated(item.id);
          showToast(ar.items.savedReturn);
          finish();
        }}
        onCancel={finish}
      />
    </div>
  );
}
