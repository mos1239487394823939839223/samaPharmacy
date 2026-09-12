/**
 * Settings and hardware configuration screen
 */

import React, { useState } from 'react';
import { useAppStore } from '../store';

export const SettingsScreen: React.FC = () => {
  const { settings, setSettings, scannerDiagnostics, printerStatus } = useAppStore();
  const [testingPrinter, setTestingPrinter] = useState(false);

  const handleTestPrinter = async () => {
    setTestingPrinter(true);
    try {
      const result = await window.electronAPI.printer.test();
      alert(`Printer test: ${result.ok ? 'Success' : 'Failed'}\n${result.findings?.join('\n')}`);
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setTestingPrinter(false);
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Pharmacy Info */}
      <section className="bg-white border rounded p-6">
        <h2 className="text-xl font-bold mb-4">معلومات الصيدلية</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الصيدلية</label>
            <input
              type="text"
              value={settings.pharmacyName}
              onChange={(e) => setSettings({ pharmacyName: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">اسم الصيدلية (عربي)</label>
            <input
              type="text"
              value={settings.pharmacyNameAr}
              onChange={(e) => setSettings({ pharmacyNameAr: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ address: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) => setSettings({ phone: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </section>

      {/* Hardware Configuration */}
      <section className="bg-white border rounded p-6">
        <h2 className="text-xl font-bold mb-4">إعدادات الأجهزة</h2>

        {/* Printer */}
        <div className="mb-6 pb-6 border-b">
          <h3 className="font-bold mb-3">الطابعة</h3>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>حالة الاتصال:</span>
              <span className={`font-bold ${printerStatus?.reachable ? 'text-green-600' : 'text-red-600'}`}>
                {printerStatus?.reachable ? 'متصلة' : 'غير متصلة'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>الورق:</span>
              <span className={`font-bold ${printerStatus?.paperOut ? 'text-red-600' : 'text-green-600'}`}>
                {printerStatus?.paperOut === null ? 'غير معروف' : printerStatus?.paperOut ? 'انتهى' : 'متوفر'}
              </span>
            </div>
          </div>
          <button
            onClick={handleTestPrinter}
            disabled={testingPrinter}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {testingPrinter ? 'جاري الاختبار...' : 'اختبر الطابعة'}
          </button>
        </div>

        {/* Scanner */}
        <div>
          <h3 className="font-bold mb-3">الماسح الضوئي</h3>
          <div className="space-y-3">
            {scannerDiagnostics && (
              <>
                <div className="flex justify-between p-3 bg-gray-50 rounded">
                  <span>العمليات الكلية:</span>
                  <span>{scannerDiagnostics.totalScans}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded">
                  <span>الوسيط:</span>
                  <span>{scannerDiagnostics.mode}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 rounded">
                  <span>متوسط الفاصل الزمني:</span>
                  <span>{scannerDiagnostics.medianIntervalMs ?? 'N/A'} ms</span>
                </div>
                {scannerDiagnostics.warnings.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    {scannerDiagnostics.warnings.map((w: string, i: number) => (
                      <p key={i} className="text-sm text-yellow-700">{w}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
