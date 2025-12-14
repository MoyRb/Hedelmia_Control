import { useDemoStore } from '../state/useDemoStore';
import { useState } from 'react';
import { ShoppingCart, Minus, Plus, Printer } from 'lucide-react';

export default function Ventas() {
  const productos = useDemoStore((s) => s.productos);
  const sabores = useDemoStore((s) => s.sabores);
  const [carrito, setCarrito] = useState<{ id: number; qty: number }[]>([]);

  const agregar = (id: number) => {
    setCarrito((prev) => {
      const existe = prev.find((p) => p.id === id);
      if (existe) return prev.map((p) => (p.id === id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { id, qty: 1 }];
    });
  };

  const cambiar = (id: number, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p))
        .filter((p) => p.qty > 0)
    );
  };

  const total = carrito.reduce((sum, item) => {
    const prod = productos.find((p) => p.id === item.id);
    return sum + (prod?.precio ?? 0) * item.qty;
  }, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      <div className="lg:col-span-2 card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">POS rápido</h2>
          <input placeholder="Buscar" className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {productos.map((p) => (
            <button
              key={p.id}
              onClick={() => agregar(p.id)}
              className="rounded-xl border border-primary/60 bg-white/80 hover:-translate-y-0.5 transition shadow-sm p-3 text-left"
            >
              <p className="font-semibold">{sabores.find((s) => s.id === p.saborId)?.nombre}</p>
              <p className="text-xs text-gray-600 capitalize">{p.tipo}</p>
              <p className="text-sm">${p.precio.toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart size={18} />
          <h3 className="font-semibold">Carrito</h3>
        </div>
        <div className="space-y-2 flex-1 overflow-auto">
          {carrito.length === 0 && <p className="text-sm text-gray-500">Agrega productos al carrito.</p>}
          {carrito.map((item) => {
            const prod = productos.find((p) => p.id === item.id);
            if (!prod) return null;
            const sabor = sabores.find((s) => s.id === prod.saborId)?.nombre ?? 'Sabor';
            return (
              <div key={item.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
                <div>
                  <p className="font-semibold">{sabor}</p>
                  <p className="text-xs text-gray-600 capitalize">{prod.tipo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1" onClick={() => cambiar(item.id, -1)}>
                    <Minus size={16} />
                  </button>
                  <span>{item.qty}</span>
                  <button className="p-1" onClick={() => cambiar(item.id, 1)}>
                    <Plus size={16} />
                  </button>
                  <p className="w-16 text-right font-semibold">${(prod.precio * item.qty).toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-3 border-t mt-3">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-semibold">${total.toFixed(2)}</p>
          <button className="mt-3 w-full bg-primary text-black font-semibold py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-2">
            <Printer size={16} /> Cobrar / Imprimir ticket
          </button>
        </div>
      </div>
    </div>
  );
}
