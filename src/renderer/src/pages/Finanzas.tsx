import { useDemoStore } from '../state/useDemoStore';

export default function Finanzas() {
  const movimientos = useDemoStore((s) => s.movimientos);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Cajas y movimientos</h2>
      <div className="card p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th>Caja</th>
              <th>Tipo</th>
              <th>Concepto</th>
              <th>Monto</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id} className="border-b border-secondary/50">
                <td className="py-1 capitalize">{m.caja}</td>
                <td className="capitalize">{m.tipo}</td>
                <td>{m.concepto}</td>
                <td>${m.monto.toFixed(2)}</td>
                <td>{new Date(m.fecha).toLocaleString('es-MX')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-3">Aperturas, cortes y transferencias están disponibles vía IPC seguro.</p>
      </div>
    </div>
  );
}
