import { useDemoStore } from '../state/useDemoStore';

export default function Clientes() {
  const clientes = useDemoStore((s) => s.clientes);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Clientes</h2>
      <div className="card p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Saldo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-b border-secondary/50">
                <td className="py-1">{c.nombre}</td>
                <td>{c.telefono ?? '—'}</td>
                <td>${c.saldo.toFixed(2)}</td>
                <td className="capitalize">{c.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
