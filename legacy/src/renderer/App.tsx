/**
 * Main React application component
 */

import React, { useEffect } from 'react';
import { useAppStore } from './store';
import { Layout } from './components/Layout';
import { SalesScreen } from './screens/Sales';
import { SettingsScreen } from './screens/Settings';

const PlaceholderScreen: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-center py-12">
    <h1 className="text-3xl font-bold mb-4">{title}</h1>
    <p className="text-gray-500">قيد التطوير</p>
  </div>
);

export const App: React.FC = () => {
  const { currentScreen } = useAppStore();

  useEffect(() => {
    // Subscribe to printer events
    window.electronAPI.printer.subscribe((event: any) => {
      console.log('Printer event:', event);
    });
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'sales':
        return <SalesScreen />;
      case 'purchase':
        return <PlaceholderScreen title="فاتورة الشراء" />;
      case 'inventory':
        return <PlaceholderScreen title="إدارة المخزون" />;
      case 'returns':
        return <PlaceholderScreen title="المرتجعات" />;
      case 'reports':
        return <PlaceholderScreen title="التقارير" />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      {renderScreen()}
    </Layout>
  );
};
