import { useEffect, useMemo, useState } from 'react';

type CashMovement = { id: number; tipo: string; concepto: string; monto: number; fecha: string; cashBoxId: number };
type CashBox = { id: number; nombre: string; tipo: 'chica' | 'grande'; movimientos: CashMovement[] };

export default function Finanzas() {
  const [cajas, setCajas] = useState<CashBox[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipoCaja, setTipoCaja] = useState<'chica' | 'grande'>('chica');
  const [form, setForm] = useState({ concepto: '', monto: '', fecha: new Date().toISOString().slice(0, 16) });

  const cargar = async () => {
    setCargando(true);
    const data = await window.hedelmia.listarCajas();
    setCajas(data);
    setCargando(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const cajaActual = useMemo(() => cajas.find((c) => c.tipo === tipoCaja), [cajas, tipoCaja]);

  const totales = useMemo(() => {
    if (!cajaActual) return { ingresos: 0, egresos: 0, balance: 0 };
    const ingresos = cajaActual.movimientos
      .filter((m) => m.tipo === 'ingreso')
      .reduce((s, m) => s + m.monto, 0);
    const egresos = cajaActual.movimientos
      .filter((m) => m.tipo === 'egreso')
      .reduce((s, m) => s + m.monto, 0);
    return { ingresos, egresos, balance: ingresos - egresos };
  }, [cajaActual]);

  const guardarMovimiento = async (tipo: 'ingreso' | 'egreso') => {
    if (!cajaActual || !form.concepto.trim() || !form.monto) return;
    await window.hedelmia.crearMovimiento({
      cashBoxId: cajaActual.id,
      tipo,
      concepto: form.concepto,
      monto: parseFloat(form.monto),
      fecha: form.fecha ? new Date(form.fecha).toISOString() : undefined
    });
    setForm({ concepto: '', monto: '', fecha: new Date().toISOString().slice(0, 16) });
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Cajas y movimientos</h2>
        <div className="flex gap-2">
          <button className={`btn ${tipoCaja === 'chica' ? 'bg-primary text-black' : ''}`} onClick={() => setTipoCaja('chica')}>
            Caja chica
          </button>
          <button className={`btn ${tipoCaja === 'grande' ? 'bg-primary text-black' : ''}`} onClick={() => setTipoCaja('grande')}>
            Caja grande
          </button>
        </div>
      </div>

      {cargando || !cajaActual ? (
        <p className="text-sm text-gray-500">Cargando movimientos...</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3">
              <p className="text-xs text-gray-500">Ingresos</p>
              <p className="text-xl font-semibold text-green-700">${totales.ingresos.toFixed(2)}</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-gray-500">Egresos</p>
              <p className="text-xl font-semibold text-red-700">${totales.egresos.toFixed(2)}</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-gray-500">Balance</p>
              <p className="text-xl font-semibold">${totales.balance.toFixed(2)}</p>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                className="input"
                placeholder="Concepto"
                value={form.concepto}
                onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
              />
              <input
                className="input"
                type="number"
                placeholder="Monto"
                value={form.monto}
                onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              />
              <input
                className="input"
                type="datetime-local"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn" onClick={() => guardarMovimiento('ingreso')}>
                Agregar ingreso
              </button>
              <button className="btn" onClick={() => guardarMovimiento('egreso')}>
                Agregar gasto
              </button>
            </div>
          </div>

          <div className="card p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {cajaActual.movimientos.map((m) => (
                  <tr key={m.id} className="border-b border-secondary/50">
                    <td className="py-1 capitalize">{m.tipo}</td>
                    <td>{m.concepto}</td>
                    <td>${m.monto.toFixed(2)}</td>
                    <td>{new Date(m.fecha).toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
