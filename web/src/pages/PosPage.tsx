import React, { useMemo, useState } from 'react';
import { PlusIcon, MinusIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { usePos } from '../context/PosContext';

type CartItem = { productId: string; quantity: number };

export const PosPage: React.FC = () => {
  const { products, recordSale } = usePos();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState<string>('');

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
    } else {
      setCart((prev) => prev.map((item) => (item.productId === productId ? { ...item, quantity } : item)));
    }
  };

  const cartItems = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const cappedQty = Math.min(item.quantity, product.stock);
        return {
          ...item,
          name: product.name,
          price: product.price,
          stock: product.stock,
          quantity: cappedQty,
          subtotal: cappedQty * product.price,
        };
      })
      .filter(Boolean) as Array<{
      productId: string;
      quantity: number;
      name: string;
      price: number;
      stock: number;
      subtotal: number;
    }>;
  }, [cart, products]);

  const total = cartItems.reduce((acc, item) => acc + item.subtotal, 0);

  const confirmSale = () => {
    const filteredCart = cart.filter((item) => item.quantity > 0);
    const result = recordSale(filteredCart);
    if (result.success) {
      setMessage('Venta registrada correctamente');
      setCart([]);
      setTimeout(() => setMessage(''), 2000);
    } else {
      setMessage(result.message ?? 'No se pudo registrar la venta');
      setTimeout(() => setMessage(''), 2500);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      <div className="lg:col-span-2 card p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Productos disponibles</h2>
          <span className="text-sm text-coffee/70">{products.length} en total</span>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto">
          {products.map((product) => (
            <div key={product.id} className="card p-4 border border-cream">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-coffee/70">Stock: {product.stock}</p>
                </div>
                <span className="font-semibold">${product.price.toFixed(2)}</span>
              </div>
              <button
                onClick={() => addToCart(product.id)}
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                disabled={product.stock === 0}
              >
                <PlusIcon className="h-4 w-4" /> Agregar
              </button>
            </div>
          ))}
          {!products.length && <p className="text-coffee/70">Crea productos para comenzar.</p>}
        </div>
      </div>

      <div className="card p-6 flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Carrito</h2>
          {message && <span className="text-sm text-accent">{message}</span>}
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {cartItems.map((item) => (
            <div key={item.productId} className="border border-cream rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-coffee/70">Stock: {item.stock}</p>
                <p className="text-sm font-medium mt-1">${item.subtotal.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-lg bg-cream hover:bg-blush/50"
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  aria-label="Disminuir"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                <button
                  className="p-2 rounded-lg bg-cream hover:bg-blush/50"
                  onClick={() => updateQuantity(item.productId, Math.min(item.quantity + 1, item.stock))}
                  aria-label="Aumentar"
                  disabled={item.quantity >= item.stock}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {!cartItems.length && <p className="text-sm text-coffee/70">No hay productos en el carrito.</p>}
        </div>

        <div className="border-t border-cream pt-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-coffee/70">Total</p>
            <p className="text-2xl font-bold">${total.toFixed(2)}</p>
          </div>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={confirmSale}
            disabled={!cartItems.length}
          >
            <CheckCircleIcon className="h-5 w-5" /> Confirmar venta
          </button>
        </div>
      </div>
    </div>
  );
};
