import { create } from 'zustand';

export type Flavor = { id: number; nombre: string; color?: string; activo: boolean };
export type Product = {
  id: number;
  tipo: 'paleta' | 'nieve';
  saborId: number;
  presentacion: string;
  precio: number;
  costo: number;
  sku?: string;
  foto?: string;
  stock: number;
};
export type Cliente = { id: number; nombre: string; telefono?: string; saldo: number; limite: number; estado: 'activo' | 'inactivo' };
export type Venta = { id: number; folio: string; fecha: string; total: number; cajero: string; metodo: string };
export type CajaMovimiento = { id: number; tipo: 'ingreso' | 'egreso'; concepto: string; monto: number; caja: 'grande' | 'chica'; fecha: string };
export type Fridge = { id: number; cliente: string; ubicacion: string; modelo: string; entregado: string; producto: string };

interface DemoState {
  sabores: Flavor[];
  productos: Product[];
  clientes: Cliente[];
  ventas: Venta[];
  movimientos: CajaMovimiento[];
  refris: Fridge[];
}

const now = new Date();

export const useDemoStore = create<DemoState>(() => ({
  sabores: [
    { id: 1, nombre: 'Fresa cremosa', color: '#ff8aa1', activo: true },
    { id: 2, nombre: 'Mango con chile', color: '#ffb347', activo: true },
    { id: 3, nombre: 'Coco', color: '#f5f5f0', activo: true },
    { id: 4, nombre: 'Nuez', color: '#d7c0ae', activo: true }
  ],
  productos: [
    { id: 1, tipo: 'paleta', saborId: 1, presentacion: 'pieza', precio: 25, costo: 9, sku: 'PAL-FRE-01', stock: 120 },
    { id: 2, tipo: 'paleta', saborId: 2, presentacion: 'pieza', precio: 27, costo: 10, sku: 'PAL-MAN-01', stock: 80 },
    { id: 3, tipo: 'nieve', saborId: 3, presentacion: 'litro', precio: 120, costo: 55, sku: 'NIE-COC-L', stock: 30 },
    { id: 4, tipo: 'nieve', saborId: 4, presentacion: 'medio litro', precio: 70, costo: 32, sku: 'NIE-NUZ-M', stock: 45 }
  ],
  clientes: [
    { id: 1, nombre: 'Cafetería Monarca', telefono: '333-000-0001', saldo: 1500, limite: 5000, estado: 'activo' },
    { id: 2, nombre: 'Escuela San Ángel', telefono: '333-000-0002', saldo: 0, limite: 3000, estado: 'activo' },
    { id: 3, nombre: 'Eventos Luna', telefono: '333-000-0003', saldo: 800, limite: 2000, estado: 'activo' }
  ],
  ventas: [
    { id: 1, folio: 'V-000123', fecha: now.toISOString(), total: 560, cajero: 'María', metodo: 'efectivo' },
    { id: 2, folio: 'V-000124', fecha: now.toISOString(), total: 320, cajero: 'Luis', metodo: 'tarjeta' }
  ],
  movimientos: [
    { id: 1, tipo: 'ingreso', concepto: 'Venta del día', monto: 880, caja: 'chica', fecha: now.toISOString() },
    { id: 2, tipo: 'egreso', concepto: 'Compra leche', monto: 300, caja: 'chica', fecha: now.toISOString() },
    { id: 3, tipo: 'ingreso', concepto: 'Depósito ventas', monto: 500, caja: 'grande', fecha: now.toISOString() }
  ],
  refris: [
    { id: 1, cliente: 'Cafetería Monarca', ubicacion: 'Centro', modelo: 'Hoshizaki 12', entregado: '2023-10-10', producto: 'Paletas surtidas' },
    { id: 2, cliente: 'Escuela San Ángel', ubicacion: 'Zona norte', modelo: 'Frigidaire 8', entregado: '2023-11-01', producto: 'Nieve en litros' }
  ]
}));
