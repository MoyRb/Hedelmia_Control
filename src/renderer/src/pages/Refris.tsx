import { useEffect, useState } from 'react';

type FridgeAsset = {
  id: number;
  modelo: string;
  serie: string;
  estado: string;
};

type FridgeAssignment = {
  id: number;
  assetId: number;
  customerId: number;
  ubicacion: string;
  entregadoEn: string;
  deposito?: number | null;
  renta?: number | null;
  asset: FridgeAsset;
};

type AsignacionConCliente = FridgeAssignment & { clienteNombre: string };

export default function Refris() {
  const [refris, setRefris] = useState<AsignacionConCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return isNaN(date.getTime()) ? fecha : date.toLocaleDateString('es-MX');
  };

  const cargarAsignaciones = async () => {
    setCargando(true);
    setError('');
    try {
      const clientes = await window.hedelmia.listarClientes();
      const asignaciones = await Promise.all(
        clientes.map(async (cliente) => {
          const data = await window.hedelmia.listarAsignacionesCliente(cliente.id);
          return data.map((a) => ({ ...a, clienteNombre: cliente.nombre }));
        })
      );
      setRefris(asignaciones.flat());
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los refris asignados.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAsignaciones();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Refris en comodato/renta</h2>
        <button className="btn text-sm" onClick={cargarAsignaciones}>
          Recargar
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="card p-4">
        {cargando ? (
          <p className="text-sm text-gray-500">Cargando refris...</p>
        ) : refris.length === 0 ? (
          <p className="text-sm text-gray-600">No hay refris asignados actualmente.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th>Cliente</th>
                <th>Ubicación</th>
                <th>Modelo</th>
                <th>Serie</th>
                <th>Entregado</th>
                <th>Depósito</th>
                <th>Renta</th>
              </tr>
            </thead>
            <tbody>
              {refris.map((r) => (
                <tr key={r.id} className="border-b border-secondary/50">
                  <td className="py-1">{r.clienteNombre}</td>
                  <td>{r.ubicacion}</td>
                  <td>{r.asset.modelo}</td>
                  <td>{r.asset.serie}</td>
                  <td>{formatearFecha(r.entregadoEn)}</td>
                  <td>{r.deposito !== null && r.deposito !== undefined ? `$${r.deposito.toFixed(2)}` : '—'}</td>
                  <td>{r.renta !== null && r.renta !== undefined ? `$${r.renta.toFixed(2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-gray-500 mt-3">Control de visitas, reposición y mermas se gestionan en historial.</p>
      </div>
    </div>
  );
}
