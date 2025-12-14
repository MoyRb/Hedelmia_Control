import { useEffect, useState } from 'react';

type Flavor = { id: number; nombre: string; color?: string | null; activo: boolean };
type ProductType = { id: number; nombre: string };
type Product = {
  id: number;
  sku?: string | null;
  presentacion: string;
  precio: number;
  costo: number;
  stock: number;
  tipo: ProductType;
  sabor: Flavor;
};

const emptySabor = { nombre: '', color: '', activo: true };
const emptyProducto = {
  tipoId: 0,
  saborId: 0,
  presentacion: '',
  precio: '',
  costo: '',
  sku: '',
  stock: '0'
};

export default function Catalogo() {
  const [sabores, setSabores] = useState<Flavor[]>([]);
  const [productos, setProductos] = useState<Product[]>([]);
  const [tipos, setTipos] = useState<ProductType[]>([]);
  const [mostrarSabor, setMostrarSabor] = useState(false);
  const [mostrarProducto, setMostrarProducto] = useState(false);
  const [nuevoSabor, setNuevoSabor] = useState(emptySabor);
  const [nuevoProducto, setNuevoProducto] = useState<typeof emptyProducto>(emptyProducto);
  const [cargando, setCargando] = useState(true);

  const cargarCatalogo = async () => {
    setCargando(true);
    const data = await window.hedelmia.listarCatalogo();
    setSabores(data.sabores);
    setProductos(data.productos);
    setTipos(data.tipos);
    setCargando(false);
  };

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const guardarSabor = async () => {
    if (!nuevoSabor.nombre.trim()) return;
    await window.hedelmia.crearSabor({
      nombre: nuevoSabor.nombre,
      color: nuevoSabor.color || undefined,
      activo: nuevoSabor.activo
    });
    setMostrarSabor(false);
    setNuevoSabor(emptySabor);
    cargarCatalogo();
  };

  const guardarProducto = async () => {
    if (!nuevoProducto.presentacion.trim() || !nuevoProducto.tipoId || !nuevoProducto.saborId) return;
    await window.hedelmia.crearProducto({
      tipoId: Number(nuevoProducto.tipoId),
      saborId: Number(nuevoProducto.saborId),
      presentacion: nuevoProducto.presentacion,
      precio: parseFloat(String(nuevoProducto.precio)),
      costo: parseFloat(String(nuevoProducto.costo)),
      sku: nuevoProducto.sku || undefined,
      stock: parseInt(String(nuevoProducto.stock || 0), 10)
    });
    setMostrarProducto(false);
    setNuevoProducto(emptyProducto);
    cargarCatalogo();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Catálogo de productos y sabores</h2>
        <div className="flex gap-2">
          <button className="btn" onClick={() => setMostrarSabor(true)}>
            Agregar sabor
          </button>
          <button className="btn" onClick={() => setMostrarProducto(true)}>
            Agregar producto
          </button>
        </div>
      </div>
      {cargando ? (
        <p className="text-sm text-gray-500">Cargando catálogo...</p>
      ) : (
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
                  <th>SKU</th>
                  <th>Tipo</th>
                  <th>Sabor</th>
                  <th>Presentación</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} className="border-b border-secondary/50">
                    <td className="py-1">{p.sku ?? '—'}</td>
                    <td className="capitalize">{p.tipo.nombre}</td>
                    <td>{p.sabor.nombre}</td>
                    <td>{p.presentacion}</td>
                    <td>${p.precio.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mostrarSabor && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20">
          <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Nuevo sabor</h4>
              <button onClick={() => setMostrarSabor(false)}>Cerrar</button>
            </div>
            <label className="flex flex-col text-sm gap-1">
              Nombre
              <input
                className="input"
                value={nuevoSabor.nombre}
                onChange={(e) => setNuevoSabor((s) => ({ ...s, nombre: e.target.value }))}
              />
            </label>
            <label className="flex flex-col text-sm gap-1">
              Color (opcional)
              <input
                className="input"
                value={nuevoSabor.color}
                onChange={(e) => setNuevoSabor((s) => ({ ...s, color: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={nuevoSabor.activo}
                onChange={(e) => setNuevoSabor((s) => ({ ...s, activo: e.target.checked }))}
              />
              Activo
            </label>
            <button className="btn w-full" onClick={guardarSabor}>
              Guardar sabor
            </button>
          </div>
        </div>
      )}

      {mostrarProducto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20">
          <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Nuevo producto</h4>
              <button onClick={() => setMostrarProducto(false)}>Cerrar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col text-sm gap-1">
                Tipo
                <select
                  className="input"
                  value={nuevoProducto.tipoId}
                  onChange={(e) => setNuevoProducto((p) => ({ ...p, tipoId: Number(e.target.value) }))}
                >
                  <option value={0}>Selecciona tipo</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Sabor
                <select
                  className="input"
                  value={nuevoProducto.saborId}
                  onChange={(e) => setNuevoProducto((p) => ({ ...p, saborId: Number(e.target.value) }))}
                >
                  <option value={0}>Selecciona sabor</option>
                  {sabores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm gap-1">
                Presentación
                <input
                  className="input"
                  value={nuevoProducto.presentacion}
                  onChange={(e) => setNuevoProducto((p) => ({ ...p, presentacion: e.target.value }))}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Precio
                <input
                  className="input"
                  type="number"
                  value={nuevoProducto.precio}
                  onChange={(e) => setNuevoProducto((p) => ({ ...p, precio: e.target.value }))}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Costo
                <input
                  className="input"
                  type="number"
                  value={nuevoProducto.costo}
                  onChange={(e) => setNuevoProducto((p) => ({ ...p, costo: e.target.value }))}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Stock inicial
                <input
                  className="input"
                  type="number"
                  value={nuevoProducto.stock}
                  onChange={(e) => setNuevoProducto((p) => ({ ...p, stock: e.target.value }))}
                />
              </label>
              <label className="flex flex-col text-sm gap-1 md:col-span-2">
                SKU (opcional)
                <input
                  className="input"
                  value={nuevoProducto.sku}
                  onChange={(e) => setNuevoProducto((p) => ({ ...p, sku: e.target.value }))}
                />
              </label>
            </div>
            <button className="btn w-full" onClick={guardarProducto}>
              Guardar producto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
