import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadFromStorage, saveToStorage } from '../utils/storage';

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

export type SaleItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Sale = {
  id: string;
  items: SaleItem[];
  total: number;
  date: string;
};

type SalePayload = { productId: string; quantity: number }[];

type PosContextValue = {
  products: Product[];
  sales: Sale[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, changes: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => void;
  recordSale: (items: SalePayload) => { success: boolean; message?: string };
};

const PosContext = createContext<PosContextValue | null>(null);
const PRODUCTS_KEY = 'hedelmia_products';
const SALES_KEY = 'hedelmia_sales';

function generateId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => loadFromStorage(PRODUCTS_KEY, []));
  const [sales, setSales] = useState<Sale[]>(() => loadFromStorage(SALES_KEY, []));

  useEffect(() => {
    const syncFromStorage = () => {
      setProducts(loadFromStorage(PRODUCTS_KEY, []));
      setSales(loadFromStorage(SALES_KEY, []));
    };

    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  useEffect(() => {
    saveToStorage(PRODUCTS_KEY, products);
  }, [products]);

  useEffect(() => {
    saveToStorage(SALES_KEY, sales);
  }, [sales]);

  const addProduct = (product: Omit<Product, 'id'>) => {
    const safeStock = Math.max(0, product.stock);
    const newProduct: Product = { ...product, stock: safeStock, id: generateId() };
    setProducts((prev) => [...prev, newProduct]);
  };

  const updateProduct = (id: string, changes: Partial<Omit<Product, 'id'>>) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== id) return product;
        const nextStock =
          changes.stock === undefined ? product.stock : Math.max(0, Number.isNaN(changes.stock) ? 0 : changes.stock);

        return { ...product, ...changes, stock: nextStock };
      }),
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const recordSale = (items: SalePayload) => {
    if (!items.length) return { success: false, message: 'El carrito está vacío' };

    const updatedProducts = [...products];
    const saleItems: SaleItem[] = [];
    let total = 0;

    for (const { productId, quantity } of items) {
      const productIndex = updatedProducts.findIndex((p) => p.id === productId);
      if (productIndex === -1) return { success: false, message: 'Producto no encontrado' };

      const product = updatedProducts[productIndex];
      if (product.stock < quantity) {
        return { success: false, message: `Stock insuficiente para ${product.name}` };
      }

      updatedProducts[productIndex] = { ...product, stock: product.stock - quantity };
      saleItems.push({ productId, name: product.name, price: product.price, quantity });
      total += product.price * quantity;
    }

    const sale: Sale = {
      id: generateId(),
      items: saleItems,
      total,
      date: new Date().toISOString(),
    };

    setProducts(updatedProducts);
    setSales((prev) => [...prev, sale]);
    return { success: true };
  };

  const value = useMemo(
    () => ({ products, sales, addProduct, updateProduct, deleteProduct, recordSale }),
    [products, sales],
  );

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
};

export function usePos() {
  const context = useContext(PosContext);
  if (!context) throw new Error('usePos debe usarse dentro de PosProvider');
  return context;
}
