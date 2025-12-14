import { useDemoStore } from '../state/useDemoStore';

export default function Creditos() {
  const clientes = useDemoStore((s) => s.clientes);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Créditos y pagarés</h2>
      <div className="card p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th>Cliente</th>
              <th>Saldo</th>
              <th>Límite</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-secondary/50">
                <td className="py-1">{c.nombre}</td>
                <td>${c.saldo.toFixed(2)}</td>
                <td>${c.limite.toFixed(2)}</td>
                <td className="capitalize">{c.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-3">Genera pagarés PDF y controla abonos desde el proceso main.</p>
      </div>
    </div>
  );
}
