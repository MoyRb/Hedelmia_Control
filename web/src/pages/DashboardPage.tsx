import React, { useMemo } from 'react';
import { usePos } from '../context/PosContext';

export const DashboardPage: React.FC = () => {
  const { products, sales } = usePos();

  const { salesToday, totalToday, lowStock } = useMemo(() => {
    const today = new Date().toLocaleDateString();
    const todaySales = sales.filter((sale) => new Date(sale.date).toLocaleDateString() === today);
    const total = todaySales.reduce((acc, sale) => acc + sale.total, 0);
    const low = products.filter((p) => p.stock <= 5);
    return { salesToday: todaySales.length, totalToday: total, lowStock: low };
  }, [products, sales]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card p-6">
        <p className="text-sm text-coffee/70">Ventas del día</p>
        <p className="text-3xl font-bold">{salesToday}</p>
        <p className="text-xs text-coffee/60 mt-1">Movimientos registrados</p>
      </div>

      <div className="card p-6">
        <p className="text-sm text-coffee/70">Total vendido</p>
        <p className="text-3xl font-bold">${totalToday.toFixed(2)}</p>
        <p className="text-xs text-coffee/60 mt-1">Suma de ventas del día</p>
      </div>

      <div className="card p-6">
        <p className="text-sm text-coffee/70">Stock bajo</p>
        <p className="text-3xl font-bold">{lowStock.length}</p>
        <p className="text-xs text-coffee/60 mt-1">Productos con 5 unidades o menos</p>
      </div>

      <div className="lg:col-span-3 card p-6">
        <h3 className="text-lg font-semibold mb-3">Alertas de stock</h3>
        <div className="space-y-2">
          {lowStock.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between bg-cream/70 border border-cream rounded-lg px-4 py-3"
            >
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-xs text-coffee/70">Existencias: {product.stock}</p>
              </div>
              <span className="text-sm font-medium text-accent">Revisar</span>
            </div>
          ))}
          {!lowStock.length && <p className="text-sm text-coffee/70">Todo el stock está saludable.</p>}
        </div>
      </div>
    </div>
  );
};
