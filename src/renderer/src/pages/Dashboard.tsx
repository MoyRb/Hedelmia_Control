import { useDemoStore } from '../state/useDemoStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const pastel = ['#f8c4a4', '#efe6c6', '#dec3cd', '#f0f0b7'];

export default function Dashboard() {
  const ventas = useDemoStore((s) => s.ventas);
  const productos = useDemoStore((s) => s.productos);
  const sabores = useDemoStore((s) => s.sabores);
  const clientes = useDemoStore((s) => s.clientes);

  const ventasPorDia = ventas.map((v) => ({ fecha: new Date(v.fecha).toLocaleDateString('es-MX'), total: v.total }));
  const topSabores = productos.map((p) => ({
    name: sabores.find((s) => s.id === p.saborId)?.nombre ?? 'Sabor',
    value: p.stock
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <DashboardCard title="Ventas hoy" value={`$${ventas.reduce((a, b) => a + b.total, 0).toFixed(2)} MXN`} />
        <DashboardCard title="Clientes activos" value={clientes.length} />
        <DashboardCard title="Productos" value={productos.length} />
        <DashboardCard title="Tickets" value={ventas.length} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Ventas por día</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ventasPorDia}>
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip formatter={(v: number) => `$${v.toFixed(2)} MXN`} />
              <Bar dataKey="total" fill="#f8c4a4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Top sabores (stock)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={topSabores} dataKey="value" nameKey="name" outerRadius={90} label>
                {topSabores.map((_, i) => (
                  <Cell key={i} fill={pastel[i % pastel.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
