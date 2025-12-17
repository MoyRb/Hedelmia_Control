import { useEffect, useState } from 'react';

type Refri = {
  id: number;
  modelo: string;
  serie: string;
  estado: 'activo' | 'inactivo' | string;
};

type RefriForm = {
  modelo: string;
  serie: string;
  estado: 'activo' | 'inactivo';
};

const emptyForm: RefriForm = { modelo: '', serie: '', estado: 'activo' };

export default function Refris() {
  const [refris, setRefris] = useState<Refri[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrandoModal, setMostrandoModal] = useState(false);
  const [editando, setEditando] = useState<Refri | null>(null);
  const [form, setForm] = useState<RefriForm>(emptyForm);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarRefris = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await window.hedelmia.listarRefris();
      setRefris(data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los refris.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarRefris();
  }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(emptyForm);
    setMostrandoModal(true);
    setMensaje('');
    setError('');
  };

  const abrirEditar = (refri: Refri) => {
    setEditando(refri);
    setForm({ modelo: refri.modelo, serie: refri.serie, estado: refri.estado as 'activo' | 'inactivo' });
    setMostrandoModal(true);
    setMensaje('');
    setError('');
  };

  const cerrarModal = () => {
    setMostrandoModal(false);
    setEditando(null);
    setForm(emptyForm);
  };

  const guardarRefri = async () => {
    if (guardando) return;
    const modelo = form.modelo.trim();
    const serie = form.serie.trim();

    if (!modelo || !serie) {
      setError('Modelo y serie son obligatorios.');
      return;
    }

    setGuardando(true);
    setError('');

    try {
      if (editando) {
        await window.hedelmia.actualizarRefri({ id: editando.id, modelo, serie, estado: form.estado });
        setMensaje('Refri actualizado correctamente.');
      } else {
        await window.hedelmia.crearRefri({ modelo, serie, estado: form.estado });
        setMensaje('Refri creado correctamente.');
      }
      cerrarModal();
      await cargarRefris();
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar el refri.');
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (refri: Refri) => {
    setError('');
    setMensaje('');
    try {
      const actualizado = await window.hedelmia.toggleRefriEstado({ id: refri.id });
      setRefris((prev) => prev.map((r) => (r.id === actualizado.id ? actualizado : r)));
    } catch (err) {
      console.error(err);
      setError('No se pudo actualizar el estado del refri.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Refris en comodato/renta</h2>
        <button className="btn" onClick={abrirNuevo}>
          Agregar refri
        </button>
      </div>

      {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card p-4">
        {cargando ? (
          <p className="text-sm text-gray-500">Cargando refris...</p>
        ) : refris.length === 0 ? (
          <p className="text-sm text-gray-600">No hay refris registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th>ID</th>
                <th>Modelo</th>
                <th>Serie</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {refris.map((r) => (
                <tr key={r.id} className="border-b border-secondary/50">
                  <td className="py-1">{r.id}</td>
                  <td>{r.modelo}</td>
                  <td>{r.serie}</td>
                  <td className="capitalize">{r.estado}</td>
                  <td className="space-x-2 text-right">
                    <button className="text-primary text-sm" onClick={() => abrirEditar(r)}>
                      Editar
                    </button>
                    <button className="text-sm text-gray-700" onClick={() => toggleEstado(r)}>
                      {r.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="text-xs text-gray-500 mt-3">
          Control de visitas, reposición y mermas se gestionan en historial.
        </p>
      </div>

      {mostrandoModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-20">
          <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{editando ? 'Editar refri' : 'Nuevo refri'}</h4>
              <button onClick={cerrarModal}>Cerrar</button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col text-sm gap-1">
                Modelo
                <input
                  className="input"
                  value={form.modelo}
                  onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Serie
                <input
                  className="input"
                  value={form.serie}
                  onChange={(e) => setForm((f) => ({ ...f, serie: e.target.value }))}
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
            <button className="btn w-full" onClick={guardarRefri} disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Actualizar refri' : 'Crear refri'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
