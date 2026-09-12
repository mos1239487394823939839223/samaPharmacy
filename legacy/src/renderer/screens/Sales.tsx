/**
 * Sales invoice screen
 */

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { useScannerSetup } from '../hooks/useScannerSetup';
import type { InvoiceLine } from '../../types';

export const SalesScreen: React.FC = () => {
  const [scannedCode, setScannedCode] = useState('');
  const { currentCart, items, addToCart, removeFromCart, updateCartLine, clearCart } = useAppStore();

  const handleItemScanned = (code: string) => {
    const item = items.find((i) => i.barcode.includes(code));
    if (item) {
      addToCart({
        itemId: item.id,
        itemName: item.name,
        qty: 1,
        unitPrice: item.unitPrice,
        total: item.unitPrice,
      });
    } else {
      alert(`الصنف غير موجود: ${code}`);
    }
    setScannedCode(code);
  };

  useScannerSetup({
    enabled: true,
    onItemScanned: handleItemScanned,
  });

  const total = currentCart.reduce((acc, line) => acc + line.total, 0);
  const egp = (piastres: number) => (piastres / 100).toFixed(2);

  return (
    <div dir="rtl" className="space-y-6">
      {/* Scanner input for manual entry */}
      <div className="bg-gray-50 p-4 rounded">
        <label className="block text-sm font-medium mb-2">رمز المنتج</label>
        <input
          type="text"
          value={scannedCode}
          onChange={(e) => setScannedCode(e.target.value)}
          placeholder="امسح الباركود أو أدخل الرمز"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {/* Cart */}
      <div className="bg-white border rounded p-6">
        <h2 className="text-xl font-bold mb-4">السلة</h2>
        {currentCart.length === 0 ? (
          <p className="text-gray-500">السلة فارغة</p>
        ) : (
          <div className="space-y-2">
            {currentCart.map((line) => (
              <div key={line.itemId} className="flex justify-between items-center border-b pb-2">
                <div className="flex-1">
                  <p className="font-medium">{line.itemName}</p>
                  <p className="text-sm text-gray-600">{egp(line.unitPrice)} ج.م</p>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    value={line.qty}
                    onChange={(e) => updateCartLine(line.itemId, parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 border rounded"
                  />
                  <span className="w-24 text-left">{egp(line.total)} ج.م</span>
                  <button
                    onClick={() => removeFromCart(line.itemId)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals */}
      {currentCart.length > 0 && (
        <div className="bg-blue-50 p-6 rounded space-y-3">
          <div className="flex justify-between text-lg font-bold">
            <span>{egp(total)} ج.م</span>
            <span>الإجمالي:</span>
          </div>
          <div className="flex gap-4">
            <button className="flex-1 bg-green-500 text-white py-3 rounded font-bold hover:bg-green-600">
              دفع نقداً
            </button>
            <button className="flex-1 bg-blue-500 text-white py-3 rounded font-bold hover:bg-blue-600">
              دفع آجل
            </button>
            <button
              onClick={clearCart}
              className="flex-1 bg-gray-500 text-white py-3 rounded font-bold hover:bg-gray-600"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
