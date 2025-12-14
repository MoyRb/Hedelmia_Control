import { useEffect, useState } from 'react';

type Customer = {
  id: number;
  nombre: string;
  telefono?: string | null;
  limite: number;
  saldo: number;
  estado: 'activo' | 'inactivo';
};

type ClienteForm = {
  nombre: string;
  telefono: string;
  limite: string;
  saldo: string;
  estado: 'activo' | 'inactivo';
};

const emptyForm: ClienteForm = {
  nombre: '',
  telefono: '',
  limite: '0',
  saldo: '0',
  estado: 'activo'
};

export default function Clientes() {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrandoModal, setMostrandoModal] = useState(false);
  const [editando, setEditando] = useState<Customer | null>(null);
  const [form, setForm] = useState<ClienteForm>(emptyForm);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarClientes = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await window.hedelmia.listarClientes();
      setClientes(data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los clientes.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(emptyForm);
    setMostrandoModal(true);
    setMensaje('');
    setError('');
  };

  const abrirEditar = (cliente: Customer) => {
    setEditando(cliente);
    setForm({
      nombre: cliente.nombre,
      telefono: cliente.telefono ?? '',
      limite: cliente.limite.toString(),
      saldo: cliente.saldo.toString(),
      estado: cliente.estado
    });
    setMostrandoModal(true);
    setMensaje('');
    setError('');
  };

  const cerrarModal = () => {
    setMostrandoModal(false);
    setEditando(null);
    setForm(emptyForm);
  };

  const guardarCliente = async () => {
    if (guardando) return;
    const limite = parseFloat(form.limite) || 0;
    const saldo = parseFloat(form.saldo) || 0;
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (limite < 0) {
      setError('El límite no puede ser negativo.');
      return;
    }
    if (saldo < 0) {
      setError('El saldo no puede ser negativo.');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      if (editando) {
        await window.hedelmia.actualizarCliente({
          id: editando.id,
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim() || undefined,
          limite,
          saldo,
          estado: form.estado
        });
        setMensaje('Cliente actualizado correctamente.');
      } else {
        await window.hedelmia.crearCliente({
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim() || undefined,
          limite,
          saldo,
          estado: form.estado
        });
        setMensaje('Cliente creado correctamente.');
      }
      cerrarModal();
      cargarClientes();
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al guardar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (cliente: Customer) => {
    const nuevoEstado = cliente.estado === 'activo' ? 'inactivo' : 'activo';
    setError('');
    try {
      await window.hedelmia.toggleClienteEstado({ id: cliente.id, estado: nuevoEstado });
      setClientes((prev) => prev.map((c) => (c.id === cliente.id ? { ...c, estado: nuevoEstado } : c)));
    } catch (err) {
      console.error(err);
      setError('No se pudo actualizar el estado del cliente.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Clientes</h2>
        <button className="btn" onClick={abrirNuevo}>
          Agregar cliente
        </button>
      </div>

      {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card p-4">
        {cargando ? (
          <p className="text-sm text-gray-500">Cargando clientes...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Límite</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-b border-secondary/50">
                  <td className="py-1">{c.nombre}</td>
                  <td>{c.telefono ?? '—'}</td>
                  <td>${c.limite.toFixed(2)}</td>
                  <td>${c.saldo.toFixed(2)}</td>
                  <td className="capitalize">{c.estado}</td>
                  <td className="space-x-2 text-right">
                    <button className="text-primary text-sm" onClick={() => abrirEditar(c)}>
                      Editar
                    </button>
                    <button className="text-sm text-gray-700" onClick={() => toggleEstado(c)}>
                      {c.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {mostrandoModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20">
          <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{editando ? 'Editar cliente' : 'Nuevo cliente'}</h4>
              <button onClick={cerrarModal}>Cerrar</button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col text-sm gap-1">
                Nombre
                <input
                  className="input"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Teléfono
                <input
                  className="input"
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Límite de crédito
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.limite}
                  onChange={(e) => setForm((f) => ({ ...f, limite: e.target.value }))}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Saldo
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.saldo}
                  onChange={(e) => setForm((f) => ({ ...f, saldo: e.target.value }))}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Estado
                <select
                  className="input"
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as 'activo' | 'inactivo' }))}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </label>
            </div>
            <button className="btn w-full" onClick={guardarCliente} disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Actualizar cliente' : 'Crear cliente'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
