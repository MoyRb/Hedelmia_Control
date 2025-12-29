import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePos } from '../context/PosContext';

const formatDay = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatShortDay = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
};

export const DashboardPage: React.FC = () => {
  const { products, sales, credits, clients } = usePos();
  const [range, setRange] = useState<'7' | '30'>('7');
  const [productMetric, setProductMetric] = useState<'amount' | 'quantity'>('amount');
  const [clientMetric, setClientMetric] = useState<'balance' | 'total'>('balance');

  const rangeDays = range === '7' ? 7 : 30;
  const rangeLabel = range === '7' ? '7 días' : '30 días';

  const lowStock = useMemo(() => products.filter((p) => p.stock <= 5), [products]);

  const {
    salesInRange,
    totalSalesAmount,
    salesCount,
    itemsSold,
    dailySalesData,
    topProducts,
    topClients,
  } = useMemo(() => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(endDate.getDate() - (rangeDays - 1));

    const isWithinRange = (dateString: string) => {
      const date = new Date(dateString);
      return date >= startDate && date <= endDate;
    };

    const salesInRange = sales.filter((sale) => isWithinRange(sale.date));
    const creditsInRange = credits.filter((credit) => isWithinRange(credit.date));

    const salesCount = salesInRange.length;
    const totalSalesAmount = salesInRange.reduce((acc, sale) => acc + sale.total, 0);
    const itemsSold = salesInRange.reduce(
      (acc, sale) => acc + sale.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0),
      0,
    );

    const dailyMap = new Map<string, number>();
    salesInRange.forEach((sale) => {
      const dayKey = formatDay(new Date(sale.date));
      dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + sale.total);
    });

    const dailySalesData = Array.from({ length: rangeDays }, (_, index) => {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + index);
      const key = formatDay(currentDate);
      return {
        day: formatShortDay(currentDate),
        total: dailyMap.get(key) ?? 0,
      };
    });

    const productTotals = new Map<
      string,
      { name: string; quantity: number; amount: number }
    >();

    salesInRange.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = productTotals.get(item.productId) ?? {
          name: item.name,
          quantity: 0,
          amount: 0,
        };
        existing.quantity += item.quantity;
        existing.amount += item.price * item.quantity;
        productTotals.set(item.productId, existing);
      });
    });

    const topProducts = Array.from(productTotals.values());

    const clientNameMap = new Map(clients.map((client) => [client.id, client.name]));
    const clientTotals = new Map<
      string,
      { name: string; balance: number; total: number }
    >();

    creditsInRange.forEach((credit) => {
      const paymentsTotal = credit.payments.reduce((acc, payment) => acc + payment.amount, 0);
      const balance = Math.max(credit.amount - paymentsTotal, 0);
      const existing = clientTotals.get(credit.clientId) ?? {
        name: clientNameMap.get(credit.clientId) ?? 'Cliente sin nombre',
        balance: 0,
        total: 0,
      };
      existing.balance += balance;
      existing.total += credit.amount;
      clientTotals.set(credit.clientId, existing);
    });

    const topClients = Array.from(clientTotals.values());

    return {
      salesInRange,
      totalSalesAmount,
      salesCount,
      itemsSold,
      dailySalesData,
      topProducts,
      topClients,
    };
  }, [credits, clients, rangeDays, sales]);

  const sortedSales = useMemo(
    () =>
      [...salesInRange].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [salesInRange],
  );

  const hasSalesData = salesInRange.length > 0;

  const productChartData = useMemo(() => {
    const sorted = [...topProducts].sort((a, b) => {
      const key = productMetric === 'amount' ? 'amount' : 'quantity';
      return b[key] - a[key];
    });
    return sorted.slice(0, 8);
  }, [productMetric, topProducts]);

  const clientChartData = useMemo(() => {
    const sorted = [...topClients].sort((a, b) => {
      const key = clientMetric === 'balance' ? 'balance' : 'total';
      return b[key] - a[key];
    });
    return sorted.slice(0, 8);
  }, [clientMetric, topClients]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-coffee">Dashboard</h2>
          <p className="text-sm text-coffee/70">
            Resumen y comparativas para los últimos {rangeLabel}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-coffee/70">Rango:</span>
          <div className="bg-cream/70 border border-cream rounded-lg p-1 inline-flex">
            {(
              [
                { label: '7 días', value: '7' },
                { label: '30 días', value: '30' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => setRange(option.value)}
                className={`px-3 py-1 rounded-md text-sm font-semibold transition ${{
                  true: 'bg-white shadow-card text-coffee',
                  false: 'text-coffee/70 hover:text-coffee',
                }[String(range === option.value) as 'true' | 'false']}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-6">
          <p className="text-sm text-coffee/70">Ventas en el rango</p>
          <p className="text-3xl font-bold">{salesCount}</p>
          <p className="text-xs text-coffee/60 mt-1">Movimientos registrados</p>
        </div>

        <div className="card p-6">
          <p className="text-sm text-coffee/70">Total vendido</p>
          <p className="text-3xl font-bold">${totalSalesAmount.toFixed(2)}</p>
          <p className="text-xs text-coffee/60 mt-1">Ingresos en {rangeLabel}</p>
        </div>

        <div className="card p-6">
          <p className="text-sm text-coffee/70">Artículos vendidos</p>
          <p className="text-3xl font-bold">{itemsSold}</p>
          <p className="text-xs text-coffee/60 mt-1">Unidades durante {rangeLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Ventas por día</h3>
            <span className="text-xs text-coffee/70">{rangeLabel}</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySalesData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e6d6" />
                <XAxis dataKey="day" stroke="#7c5b47" tickLine={false} />
                <YAxis stroke="#7c5b47" tickLine={false} />
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  labelFormatter={(label) => `Fecha: ${label}`}
                />
                <Line type="monotone" dataKey="total" stroke="#c17a45" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {!hasSalesData && <p className="text-sm text-coffee/70 mt-2">No hay datos en este rango.</p>}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Top productos</h3>
            <div className="bg-cream/70 border border-cream rounded-lg p-1 inline-flex text-xs font-semibold">
              {(
                [
                  { label: 'Por monto', value: 'amount' },
                  { label: 'Por cantidad', value: 'quantity' },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setProductMetric(option.value)}
                  className={`px-2 py-1 rounded-md transition ${{
                    true: 'bg-white shadow-card text-coffee',
                    false: 'text-coffee/70 hover:text-coffee',
                  }[String(productMetric === option.value) as 'true' | 'false']}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {productChartData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, bottom: 5, left: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1e6d6" />
                  <XAxis type="number" stroke="#7c5b47" tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#7c5b47" width={120} />
                  <Tooltip
                    formatter={(value: number) =>
                      productMetric === 'amount' ? `$${value.toFixed(2)}` : `${value} uds`
                    }
                  />
                  <Bar dataKey={productMetric === 'amount' ? 'amount' : 'quantity'} fill="#c17a45" radius={[6, 6, 6, 6]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-coffee/70">No hay datos en este rango.</p>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold">Top clientes (créditos)</h3>
          <div className="bg-cream/70 border border-cream rounded-lg p-1 inline-flex text-xs font-semibold">
            {(
              [
                { label: 'Saldo', value: 'balance' },
                { label: 'Total créditos', value: 'total' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => setClientMetric(option.value)}
                className={`px-3 py-1 rounded-md transition ${{
                  true: 'bg-white shadow-card text-coffee',
                  false: 'text-coffee/70 hover:text-coffee',
                }[String(clientMetric === option.value) as 'true' | 'false']}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {clientChartData.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientChartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e6d6" />
                <XAxis type="number" stroke="#7c5b47" tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#7c5b47" width={150} />
                <Tooltip
                  formatter={(value: number) =>
                    clientMetric === 'balance' ? `$${value.toFixed(2)}` : `$${value.toFixed(2)}`
                  }
                />
                <Bar dataKey={clientMetric === 'balance' ? 'balance' : 'total'} fill="#7aa8a2" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-coffee/70">No hay datos en este rango.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
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

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-3">Ventas registradas en el rango</h3>
          <div className="space-y-2">
            {sortedSales.map((sale) => {
              const saleDate = new Date(sale.date);
              const time = saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateLabel = saleDate.toLocaleDateString();
              const itemsCount = sale.items.reduce((acc, item) => acc + item.quantity, 0);
              return (
                <div
                  key={sale.id}
                  className="flex items-center justify-between bg-cream/70 border border-cream rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{dateLabel}</p>
                    <p className="text-xs text-coffee/70">
                      {time} · {itemsCount} artículos vendidos
                    </p>
                  </div>
                  <span className="text-sm font-semibold">${sale.total.toFixed(2)}</span>
                </div>
              );
            })}
            {!sortedSales.length && (
              <p className="text-sm text-coffee/70">No hay ventas en este rango.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
