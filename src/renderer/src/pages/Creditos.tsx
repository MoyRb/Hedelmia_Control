import { useEffect, useMemo, useState } from 'react';
import type { Customer, PromissoryNote, PromissoryPayment } from '../../../preload';

type PagareConAbonos = PromissoryNote & { abonos?: PromissoryPayment[] };

export default function Creditos() {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [pagares, setPagares] = useState<PagareConAbonos[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Customer | null>(null);
  const [pagareSeleccionado, setPagareSeleccionado] = useState<PagareConAbonos | null>(null);
  const [pagareParaAbono, setPagareParaAbono] = useState<PagareConAbonos | null>(null);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [cargandoPagares, setCargandoPagares] = useState(false);
  const [mostrandoModal, setMostrandoModal] = useState(false);
  const [mostrandoModalAbono, setMostrandoModalAbono] = useState(false);
  const [monto, setMonto] = useState('');
  const [montoAbono, setMontoAbono] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardandoAbono, setGuardandoAbono] = useState(false);

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
      if (!pagareSeleccionado && data.length > 0) {
        setPagareSeleccionado(data[0]);
      }
      if (pagareSeleccionado) {
        const actualizado = data.find((p) => p.id === pagareSeleccionado.id) ?? null;
        setPagareSeleccionado(actualizado);
      }
      return data;
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los pagarés del cliente.');
      return [];
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
    setPagareSeleccionado(null);
    setPagareParaAbono(null);
    setMostrandoModalAbono(false);
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

  const cerrarModalAbono = () => {
    setMostrandoModalAbono(false);
    setMontoAbono('');
    setPagareParaAbono(null);
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

  const abrirModalAbono = (pagare: PagareConAbonos) => {
    setPagareParaAbono(pagare);
    setMontoAbono(pagare.monto.toString());
    setMensaje('');
    setError('');
    setMostrandoModalAbono(true);
  };

  const registrarAbono = async () => {
    if (!pagareParaAbono || !clienteSeleccionado || guardandoAbono) return;

    const montoNumero = Number(montoAbono);
    if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
      setError('Ingresa un monto válido para el abono.');
      return;
    }
    if (montoNumero > pagareParaAbono.monto) {
      setError('El abono no puede ser mayor al monto pendiente del pagaré.');
      return;
    }

    setGuardandoAbono(true);
    setError('');
    setMensaje('');
    try {
      const resultado = await window.hedelmia.registrarAbonoPagare({
        promissoryNoteId: pagareParaAbono.id,
        monto: montoNumero
      });

      setMensaje('Abono registrado correctamente.');
      cerrarModalAbono();

      const nuevosPagares = await cargarPagares(clienteSeleccionado.id);
      setPagareSeleccionado(nuevosPagares.find((p) => p.id === resultado.pagare.id) ?? null);
      await cargarClientes();
    } catch (err) {
      console.error(err);
      setError('No se pudo registrar el abono.');
    } finally {
      setGuardandoAbono(false);
    }
  };

  const pagaresVigentes = useMemo(() => pagares.filter((p) => p.estado === 'vigente'), [pagares]);
  const pagaresHistoricos = useMemo(() => pagares.filter((p) => p.estado !== 'vigente'), [pagares]);

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
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pagarés vigentes</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="py-1">Monto pendiente</th>
                        <th className="py-1">Fecha</th>
                        <th className="py-1">Abonos</th>
                        <th className="py-1">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagaresVigentes.length === 0 && (
                        <tr>
                          <td className="py-2 text-gray-500" colSpan={4}>
                            No hay pagarés vigentes para este cliente.
                          </td>
                        </tr>
                      )}
                      {pagaresVigentes.map((p) => (
                        <tr key={p.id} className="border-b border-secondary/50">
                          <td className="py-2">${p.monto.toFixed(2)}</td>
                          <td>{new Date(p.fecha).toLocaleDateString('es-MX')}</td>
                          <td>{p.abonos?.length ?? 0}</td>
                          <td className="py-2">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                className="px-3 py-1 text-xs rounded bg-secondary/40 hover:bg-secondary/60"
                                onClick={() => setPagareSeleccionado(p)}
                              >
                                Ver historial
                              </button>
                              <button
                                className="px-3 py-1 text-xs rounded bg-primary hover:bg-primary/80 text-black disabled:opacity-60"
                                disabled={p.monto <= 0}
                                onClick={() => abrirModalAbono(p)}
                              >
                                Registrar abono
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pagaresHistoricos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Historial de pagarés</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-1">Monto final</th>
                          <th className="py-1">Fecha</th>
                          <th className="py-1">Estado</th>
                          <th className="py-1">Abonos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagaresHistoricos.map((p) => (
                          <tr key={p.id} className="border-b border-secondary/50">
                            <td className="py-2">${p.monto.toFixed(2)}</td>
                            <td>{new Date(p.fecha).toLocaleDateString('es-MX')}</td>
                            <td className="capitalize">{p.estado}</td>
                            <td>{p.abonos?.length ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">Historial de abonos</p>
          {pagareSeleccionado && (
            <span className="text-xs text-gray-500">
              Pagaré #{pagareSeleccionado.id} · Estado {pagareSeleccionado.estado}
            </span>
          )}
        </div>

        {!pagareSeleccionado ? (
          <p className="text-sm text-gray-500">Selecciona un pagaré para ver sus abonos.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Monto pendiente: <span className="font-semibold">${pagareSeleccionado.monto.toFixed(2)}</span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-1">Monto</th>
                    <th className="py-1">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {(pagareSeleccionado.abonos ?? []).length === 0 ? (
                    <tr>
                      <td className="py-2 text-gray-500" colSpan={2}>
                        Sin abonos registrados.
                      </td>
                    </tr>
                  ) : (
                    pagareSeleccionado.abonos?.map((a) => (
                      <tr key={a.id} className="border-b border-secondary/50">
                        <td className="py-2">${a.monto.toFixed(2)}</td>
                        <td>{new Date(a.fecha).toLocaleDateString('es-MX')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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

      {mostrandoModalAbono && clienteSeleccionado && pagareParaAbono && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-10">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Registrar abono</h3>
            <p className="text-sm text-gray-600">
              Cliente: <span className="font-medium">{clienteSeleccionado.nombre}</span>
            </p>
            <p className="text-sm text-gray-600">
              Pagaré #{pagareParaAbono.id} · Pendiente ${pagareParaAbono.monto.toFixed(2)}
            </p>
            <div className="space-y-2">
              <label className="text-sm text-gray-700">
                Monto (máximo ${pagareParaAbono.monto.toFixed(2)})
              </label>
              <input
                type="number"
                className="w-full border border-secondary rounded px-3 py-2"
                value={montoAbono}
                min={0}
                max={pagareParaAbono.monto}
                step="0.01"
                onChange={(e) => setMontoAbono(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-2 rounded bg-secondary/50 hover:bg-secondary/70 text-sm" onClick={cerrarModalAbono}>
                Cancelar
              </button>
              <button
                className="px-3 py-2 rounded bg-primary hover:bg-primary/80 text-sm text-black disabled:opacity-60"
                disabled={guardandoAbono}
                onClick={registrarAbono}
              >
                {guardandoAbono ? 'Guardando...' : 'Confirmar abono'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
