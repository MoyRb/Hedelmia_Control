import { useEffect, useState } from 'react';
import type { Customer, PromissoryNote } from '../../../preload';

export default function Creditos() {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [pagares, setPagares] = useState<PromissoryNote[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Customer | null>(null);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [cargandoPagares, setCargandoPagares] = useState(false);
  const [mostrandoModal, setMostrandoModal] = useState(false);
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarClientes = async () => {
    setCargandoClientes(true);
    setError('');
    try {
      const data = await window.hedelmia.listarClientesConSaldo();
      setClientes(data);
      if (clienteSeleccionado) {
        const actualizado = data.find((c) => c.id === clienteSeleccionado.id) ?? null;
        setClienteSeleccionado(actualizado);
      }
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los clientes con saldo.');
    } finally {
      setCargandoClientes(false);
    }
  };

  const cargarPagares = async (clienteId: number) => {
    setCargandoPagares(true);
    setError('');
    try {
      const data = await window.hedelmia.listarPagaresPorCliente(clienteId);
      setPagares(data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los pagarés del cliente.');
    } finally {
      setCargandoPagares(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const seleccionarCliente = (cliente: Customer) => {
    setClienteSeleccionado(cliente);
    setMensaje('');
    setPagares([]);
    cargarPagares(cliente.id);
  };

  const abrirModalPagare = (cliente: Customer) => {
    setClienteSeleccionado(cliente);
    setMonto(cliente.saldo.toString());
    setMensaje('');
    setError('');
    setMostrandoModal(true);
  };

  const cerrarModal = () => {
    setMostrandoModal(false);
    setMonto('');
  };

  const generarPagare = async () => {
    if (!clienteSeleccionado || guardando) return;

    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    if (montoNumero > clienteSeleccionado.saldo) {
      setError('El monto no puede superar el saldo disponible.');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await window.hedelmia.crearPagare({ customerId: clienteSeleccionado.id, monto: montoNumero });
      setMensaje('Pagaré generado correctamente.');
      cerrarModal();
      await Promise.all([cargarPagares(clienteSeleccionado.id), cargarClientes()]);
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el pagaré.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Créditos y pagarés</h2>

      {error && <div className="rounded bg-red-100 text-red-700 px-3 py-2 text-sm">{error}</div>}
      {mensaje && <div className="rounded bg-emerald-100 text-emerald-700 px-3 py-2 text-sm">{mensaje}</div>}

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">Clientes con saldo</p>
          {cargandoClientes && <span className="text-xs text-gray-500">Cargando...</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-1">Cliente</th>
                <th className="py-1">Saldo</th>
                <th className="py-1">Límite</th>
                <th className="py-1">Estado</th>
                <th className="py-1">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 && !cargandoClientes && (
                <tr>
                  <td className="py-2 text-gray-500" colSpan={5}>
                    No hay clientes con saldo pendiente.
                  </td>
                </tr>
              )}
              {clientes.map((c) => (
                <tr key={c.id} className="border-b border-secondary/50">
                  <td className="py-2">{c.nombre}</td>
                  <td>${c.saldo.toFixed(2)}</td>
                  <td>${c.limite.toFixed(2)}</td>
                  <td className="capitalize">{c.estado}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 text-xs rounded bg-secondary/40 hover:bg-secondary/60"
                        onClick={() => seleccionarCliente(c)}
                      >
                        Ver pagarés
                      </button>
                      <button
                        className="px-3 py-1 text-xs rounded bg-primary hover:bg-primary/80 text-black"
                        onClick={() => abrirModalPagare(c)}
                      >
                        Generar pagaré
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500">El pagaré inicia vigente y no descuenta el saldo.</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">
            Pagarés {clienteSeleccionado ? `de ${clienteSeleccionado.nombre}` : 'por cliente'}
          </p>
          {clienteSeleccionado && (
            <span className="text-xs text-gray-500">
              Saldo disponible: ${clienteSeleccionado.saldo.toFixed(2)}
            </span>
          )}
        </div>
        {!clienteSeleccionado && <p className="text-sm text-gray-500">Selecciona un cliente para ver sus pagarés.</p>}
        {clienteSeleccionado && (
          <div className="overflow-x-auto">
            {cargandoPagares ? (
              <p className="text-sm text-gray-500">Cargando pagarés...</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-1">Monto</th>
                    <th className="py-1">Fecha</th>
                    <th className="py-1">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagares.length === 0 && (
                    <tr>
                      <td className="py-2 text-gray-500" colSpan={3}>
                        No hay pagarés registrados para este cliente.
                      </td>
                    </tr>
                  )}
                  {pagares.map((p) => (
                    <tr key={p.id} className="border-b border-secondary/50">
                      <td className="py-2">${p.monto.toFixed(2)}</td>
                      <td>{new Date(p.fecha).toLocaleDateString('es-MX')}</td>
                      <td className="capitalize">{p.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {mostrandoModal && clienteSeleccionado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Generar pagaré</h3>
            <p className="text-sm text-gray-600">
              Cliente: <span className="font-medium">{clienteSeleccionado.nombre}</span>
            </p>
            <div className="space-y-2">
              <label className="text-sm text-gray-700">Monto (máximo ${clienteSeleccionado.saldo.toFixed(2)})</label>
              <input
                type="number"
                className="w-full border border-secondary rounded px-3 py-2"
                value={monto}
                min={0}
                max={clienteSeleccionado.saldo}
                step="0.01"
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-2 rounded bg-secondary/50 hover:bg-secondary/70 text-sm" onClick={cerrarModal}>
                Cancelar
              </button>
              <button
                className="px-3 py-2 rounded bg-primary hover:bg-primary/80 text-sm text-black disabled:opacity-60"
                disabled={guardando}
                onClick={generarPagare}
              >
                {guardando ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
