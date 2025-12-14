import { useDemoStore } from '../state/useDemoStore';

export default function Refris() {
  const refris = useDemoStore((s) => s.refris);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Refris en comodato/renta</h2>
      <div className="card p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th>Cliente</th>
              <th>Ubicación</th>
              <th>Modelo</th>
              <th>Entregado</th>
              <th>Producto</th>
            </tr>
          </thead>
          <tbody>
            {refris.map((r) => (
              <tr key={r.id} className="border-b border-secondary/50">
                <td className="py-1">{r.cliente}</td>
                <td>{r.ubicacion}</td>
                <td>{r.modelo}</td>
                <td>{r.entregado}</td>
                <td>{r.producto}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-3">Control de visitas, reposición y mermas se gestionan en historial.</p>
      </div>
    </div>
  );
}
