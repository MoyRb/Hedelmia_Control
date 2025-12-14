import { useDemoStore } from '../state/useDemoStore';

export default function Inventario() {
  const productos = useDemoStore((s) => s.productos);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Inventarios</h2>
      <div className="card p-4">
        <h3 className="font-semibold mb-2">Producto terminado</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th>SKU</th>
              <th>Tipo</th>
              <th>Presentación</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-secondary/50">
                <td className="py-1">{p.sku}</td>
                <td className="capitalize">{p.tipo}</td>
                <td>{p.presentacion}</td>
                <td>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-3">Incluye control de ajustes, mermas y producción.</p>
      </div>
    </div>
  );
}
