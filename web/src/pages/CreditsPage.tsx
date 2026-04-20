import React, { useMemo, useState } from 'react';
import { usePos } from '../context/PosContext';

const today = new Date().toISOString().slice(0, 10);

type PaymentInput = { amount: number; note: string; date: string };

export const CreditsPage: React.FC = () => {
  const { credits, clients, addCredit, addCreditPayment, updateCreditStatus } = usePos();
  const [form, setForm] = useState({ clientId: '', amount: 0, date: today });
  const [selectedClientId, setSelectedClientId] = useState<'all' | string>('all');
  const [paymentInputs, setPaymentInputs] = useState<Record<string, PaymentInput>>({});

  const sortedCredits = useMemo(
    () => [...credits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [credits],
  );

  const clientOptions = useMemo(() => {
    const baseClients = clients.map((client) => ({
      id: client.id,
      label: client.active ? client.name : `${client.name} (inactivo)`,
      sortName: client.name,
    }));
    const knownIds = new Set(baseClients.map((client) => client.id));
    const missingClients = Array.from(new Set(credits.map((credit) => credit.clientId)))
      .filter((clientId) => !knownIds.has(clientId))
      .map((clientId) => ({
        id: clientId,
        label: `Cliente no disponible (${clientId.slice(0, 8)})`,
        sortName: `zz-${clientId}`,
      }));

    return [...baseClients, ...missingClients].sort((a, b) => a.sortName.localeCompare(b.sortName));
  }, [clients, credits]);

  const getCreditPayments = (credit: (typeof credits)[number]) =>
    Array.isArray(credit.payments) ? credit.payments : [];

  const getClientName = (clientId: string) =>
    clientOptions.find((client) => client.id === clientId)?.label ?? `Cliente no disponible (${clientId.slice(0, 8)})`;

  const visibleCredits = useMemo(
    () =>
      sortedCredits.filter((credit) =>
        selectedClientId === 'all' ? true : credit.clientId === selectedClientId,
      ),
    [sortedCredits, selectedClientId],
  );

  const creditSummary = useMemo(() => {
    const totalCredited = visibleCredits.reduce((acc, credit) => acc + Number(credit.amount || 0), 0);
    const totalPaid = visibleCredits.reduce((acc, credit) => {
      const paid = getCreditPayments(credit).reduce((paymentAcc, payment) => paymentAcc + Number(payment.amount || 0), 0);
      return acc + paid;
    }, 0);

    const activeCredits = visibleCredits.reduce((acc, credit) => {
      const paid = getCreditPayments(credit).reduce((paymentAcc, payment) => paymentAcc + Number(payment.amount || 0), 0);
      const remaining = Math.max(Number(credit.amount || 0) - paid, 0);
      return acc + (remaining > 0 || credit.status === 'pendiente' ? 1 : 0);
    }, 0);

    return {
      totalCredited,
      totalPaid,
      pendingBalance: Math.max(totalCredited - totalPaid, 0),
      activeCredits,
    };
  }, [visibleCredits]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.clientId || form.amount <= 0) return;
    addCredit({ clientId: form.clientId, amount: Number(form.amount), date: form.date });
    setForm({ clientId: '', amount: 0, date: today });
  };

  const updatePaymentInput = (creditId: string, changes: Partial<PaymentInput>) => {
    setPaymentInputs((prev) => ({
      ...prev,
      [creditId]: { amount: prev[creditId]?.amount ?? 0, note: prev[creditId]?.note ?? '', date: today, ...changes },
    }));
  };

  const addPayment = (creditId: string) => {
    const input = paymentInputs[creditId];
    if (!input || input.amount <= 0) return;
    addCreditPayment(creditId, { amount: Number(input.amount), note: input.note, date: input.date });
    updatePaymentInput(creditId, { amount: 0, note: '' });
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Nuevo crédito</h2>
          <span className="text-sm text-coffee/70">Vincula con un cliente</span>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">
            Cliente
            <select
              className="border border-cream rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint"
              value={form.clientId}
              onChange={(e) => setForm((prev) => ({ ...prev, clientId: e.target.value }))}
              required
            >
              <option value="">Selecciona un cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Monto
            <input
              type="number"
              min={0}
              step={0.01}
              className="border border-cream rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value) }))}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Fecha
            <input
              type="date"
              className="border border-cream rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </label>
          <button type="submit" className="btn-primary md:col-span-4">
            Registrar crédito
          </button>
        </form>
        {!clients.length && (
          <p className="text-sm text-coffee/70 mt-2">Crea clientes primero para poder asignar créditos.</p>
        )}
      </div>

      <div className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Créditos activos</h2>
          <span className="text-sm text-coffee/70">{credits.length} totales</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium lg:col-span-2">
            Consultar cliente
            <select
              className="border border-cream rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint"
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
            >
              <option value="all">Todos los clientes</option>
              {clientOptions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg bg-cream/60 p-3">
            <p className="text-xs text-coffee/70">Total acreditado</p>
            <p className="text-lg font-semibold">${creditSummary.totalCredited.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-cream/60 p-3">
            <p className="text-xs text-coffee/70">Total abonado</p>
            <p className="text-lg font-semibold">${creditSummary.totalPaid.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-cream/60 p-3">
            <p className="text-xs text-coffee/70">Saldo pendiente</p>
            <p className="text-lg font-semibold">${creditSummary.pendingBalance.toFixed(2)}</p>
          </div>
        </div>

        <div className="rounded-lg bg-white border border-cream px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p>
            <span className="text-coffee/70">Créditos activos o pendientes:</span>{' '}
            <span className="font-semibold">{creditSummary.activeCredits}</span>
          </p>
          <p>
            <span className="text-coffee/70">Créditos visibles:</span>{' '}
            <span className="font-semibold">{visibleCredits.length}</span>
          </p>
          <p>
            <span className="text-coffee/70">Deuda total:</span>{' '}
            <span className="font-semibold">${creditSummary.pendingBalance.toFixed(2)}</span>
          </p>
        </div>

        {!sortedCredits.length && <p className="text-sm text-coffee/70">Aún no hay créditos registrados.</p>}

        {!!sortedCredits.length && !visibleCredits.length && (
          <p className="text-sm text-coffee/70">No hay créditos para el cliente seleccionado.</p>
        )}

        <div className="space-y-3">
          {visibleCredits.map((credit) => {
            const payments = getCreditPayments(credit);
            const paid = payments.reduce((acc, payment) => acc + payment.amount, 0);
            const remaining = Math.max(credit.amount - paid, 0);
            const clientName = getClientName(credit.clientId);
            const paymentInput = paymentInputs[credit.id] ?? { amount: 0, note: '', date: today };

            return (
              <div key={credit.id} className="border border-cream rounded-lg p-4 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-coffee/70">{formatDate(credit.date)}</p>
                    <p className="text-lg font-semibold">{clientName}</p>
                    <p className="text-sm text-coffee/70">Crédito por ${credit.amount.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-coffee/70">Saldo</p>
                      <p className="text-2xl font-bold">${remaining.toFixed(2)}</p>
                    </div>
                    <select
                      value={credit.status}
                      onChange={(e) => updateCreditStatus(credit.id, e.target.value as typeof credit.status)}
                      className="border border-cream rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="pagado">Pagado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
                  <div className="lg:col-span-2 bg-cream/60 rounded-lg p-3">
                    <p className="text-xs font-semibold text-coffee mb-2">Abonos</p>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2">
                          <div>
                            <p className="font-semibold">${payment.amount.toFixed(2)}</p>
                            <p className="text-xs text-coffee/70">{payment.note || 'Sin nota'}</p>
                          </div>
                          <span className="text-xs text-coffee/70">{formatDate(payment.date)}</span>
                        </div>
                      ))}
                      {!payments.length && (
                        <p className="text-xs text-coffee/70">Sin abonos registrados.</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-cream/60 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-coffee">Agregar abono</p>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-full border border-cream rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint text-sm"
                      value={paymentInput.amount}
                      onChange={(e) => updatePaymentInput(credit.id, { amount: Number(e.target.value) })}
                      placeholder="Monto"
                    />
                    <input
                      className="w-full border border-cream rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint text-sm"
                      value={paymentInput.note}
                      onChange={(e) => updatePaymentInput(credit.id, { note: e.target.value })}
                      placeholder="Nota (opcional)"
                    />
                    <input
                      type="date"
                      className="w-full border border-cream rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mint text-sm"
                      value={paymentInput.date}
                      onChange={(e) => updatePaymentInput(credit.id, { date: e.target.value })}
                    />
                    <button
                      onClick={() => addPayment(credit.id)}
                      className="btn-primary w-full"
                      disabled={paymentInput.amount <= 0}
                    >
                      Registrar abono
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
