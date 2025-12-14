import { useDemoStore } from '../state/useDemoStore';

export default function Catalogo() {
  const sabores = useDemoStore((s) => s.sabores);
  const productos = useDemoStore((s) => s.productos);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Catálogo de productos y sabores</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Sabores</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th>Nombre</th>
                <th>Color</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sabores.map((sabor) => (
                <tr key={sabor.id} className="border-b border-secondary/50">
                  <td className="py-1">{sabor.nombre}</td>
                  <td>{sabor.color ?? '—'}</td>
                  <td>{sabor.activo ? 'Activo' : 'Inactivo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Productos</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th>Producto</th>
                <th>Tipo</th>
                <th>Presentación</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className="border-b border-secondary/50">
                  <td className="py-1">{p.sku}</td>
                  <td className="capitalize">{p.tipo}</td>
                  <td>{p.presentacion}</td>
                  <td>${p.precio.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
