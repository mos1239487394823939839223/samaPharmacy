/**
 * Main layout component with sidebar and header
 */

import React from 'react';
import { useAppStore } from '../store';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarOpen, toggleSidebar, currentScreen, setCurrentScreen, darkMode } = useAppStore();

  const screens = [
    { id: 'sales', label: 'المبيعات', icon: '🛒' },
    { id: 'purchase', label: 'الشراء', icon: '📦' },
    { id: 'inventory', label: 'المخزون', icon: '📊' },
    { id: 'returns', label: 'المرتجعات', icon: '↩️' },
    { id: 'reports', label: 'التقارير', icon: '📈' },
    { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
  ];

  return (
    <div
      className={`h-screen flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
      dir="rtl"
    >
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} border-l transition-all duration-300`}
      >
        <div className="p-4 flex justify-between items-center">
          <h1 className={`font-bold text-xl ${!sidebarOpen && 'hidden'}`}>صيدلية سما</h1>
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded hover:${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
          >
            ☰
          </button>
        </div>

        <nav className="space-y-2 p-4">
          {screens.map((screen) => (
            <button
              key={screen.id}
              onClick={() => setCurrentScreen(screen.id as any)}
              className={`w-full text-right p-3 rounded transition ${
                currentScreen === screen.id
                  ? `${darkMode ? 'bg-blue-700' : 'bg-blue-500'} text-white`
                  : `hover:${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`
              }`}
            >
              <span className="mr-2">{screen.icon}</span>
              {sidebarOpen && screen.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4`}>
          <div className="flex justify-between items-center">
            <div className="text-lg font-semibold">
              {screens.find((s) => s.id === currentScreen)?.label}
            </div>
            <div className="flex gap-4">
              <span className="text-sm">تاريخ: {new Date().toLocaleDateString('ar-EG')}</span>
              <span className="text-sm">الوقت: {new Date().toLocaleTimeString('ar-EG')}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
