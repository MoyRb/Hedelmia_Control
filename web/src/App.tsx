import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { PosProvider } from './context/PosContext';
import { ProductsPage } from './pages/ProductsPage';
import { PosPage } from './pages/PosPage';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';

const views = {
  dashboard: <DashboardPage />,
  pos: <PosPage />,
  products: <ProductsPage />,
  sales: <SalesPage />,
};

const titles: Record<string, string> = {
  dashboard: 'Panel general',
  pos: 'Punto de venta',
  products: 'Productos',
  sales: 'Ventas',
};

const AppContent: React.FC = () => {
  const [view, setView] = useState<keyof typeof views>('dashboard');

  return (
    <div className="h-screen flex bg-cream">
      <Sidebar current={view} onSelect={setView} />
      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between p-6 sticky top-0 bg-cream/90 backdrop-blur border-b border-cream/80">
          <div>
            <p className="text-xs uppercase text-coffee/60 font-semibold">Hedelmiá POS</p>
            <h1 className="text-2xl font-bold">{titles[view]}</h1>
          </div>
          <div className="px-4 py-2 rounded-lg bg-white shadow-card text-sm">Modo offline / localStorage</div>
        </header>
        <div className="p-6">{views[view]}</div>
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <PosProvider>
    <AppContent />
  </PosProvider>
);

export default App;
