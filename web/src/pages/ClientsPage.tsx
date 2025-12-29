import React, { useMemo, useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { usePos, Client } from '../context/PosContext';

const emptyClient: Omit<Client, 'id'> = { name: '', active: true, notes: '' };

export const ClientsPage: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient } = usePos();
  const [form, setForm] = useState<Omit<Client, 'id'>>(emptyClient);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name)),
    [clients],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      updateClient(editingId, form);
    } else {
      addClient(form);
    }

    setForm(emptyClient);
    setEditingId(null);
  };

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({ name: client.name, active: client.active, notes: client.notes });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyClient);
  };

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          {editingId && (
            <button onClick={cancelEdit} className="text-sm text-accent underline">
              Cancelar edición
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">
            Nombre
            <input
              className="border border-cream rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Notas
            <input
              className="border border-cream rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
            />
            Activo
          </label>
          <button type="submit" className="btn-primary md:col-span-4">
            {editingId ? 'Guardar cambios' : 'Agregar cliente'}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Clientes</h2>
          <span className="text-sm text-coffee/70">{clients.length} registrados</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-coffee/70">
                <th className="pb-2">Nombre</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Notas</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream">
              {sortedClients.map((client) => (
                <tr key={client.id} className="hover:bg-cream/60">
                  <td className="py-3 font-medium">{client.name}</td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        client.active ? 'bg-mint/30 text-accent' : 'bg-blush/40 text-coffee'
                      }`}
                    >
                      {client.active ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : (
                        <XCircleIcon className="h-4 w-4" />
                      )}
                      {client.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-3 text-coffee/80">{client.notes || '-'}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(client)}
                        className="px-3 py-2 rounded-lg bg-cream text-coffee hover:bg-blush/50 text-xs font-semibold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteClient(client.id)}
                        className="px-3 py-2 rounded-lg bg-cream text-coffee hover:bg-blush/50 text-xs font-semibold"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!sortedClients.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-coffee/70">
                    Aún no hay clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
