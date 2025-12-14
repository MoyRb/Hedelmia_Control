import { contextBridge, ipcRenderer } from 'electron';

export type Flavor = { id: number; nombre: string; color?: string | null; activo: boolean };
export type ProductType = { id: number; nombre: string };
export type Product = {
  id: number;
  sku?: string | null;
  presentacion: string;
  precio: number;
  costo: number;
  stock: number;
  tipoId?: number;
  saborId?: number;
  tipo: ProductType;
  sabor: Flavor;
};

export type CashMovement = { id: number; cashBoxId: number; tipo: string; concepto: string; monto: number; fecha: string };
export type CashBox = { id: number; nombre: string; tipo: string; movimientos: CashMovement[] };
export type Customer = {
  id: number;
  nombre: string;
  telefono?: string | null;
  limite: number;
  saldo: number;
  estado: 'activo' | 'inactivo';
};

contextBridge.exposeInMainWorld('hedelmia', {
  exportarBackup: (destino: string) => ipcRenderer.invoke('backup:export', destino),
  listarCatalogo: () => ipcRenderer.invoke('catalogo:listar') as Promise<{ sabores: Flavor[]; productos: Product[]; tipos: ProductType[] }>,
  crearSabor: (data: { nombre: string; color?: string; activo?: boolean }) => ipcRenderer.invoke('catalogo:crearSabor', data),
  crearProducto: (data: {
    tipoId: number;
    saborId: number;
    presentacion: string;
    precio: number;
    costo: number;
    sku?: string;
    stock?: number;
  }) => ipcRenderer.invoke('catalogo:crearProducto', data),
  listarCajas: () => ipcRenderer.invoke('cajas:listarMovimientos') as Promise<CashBox[]>,
  crearMovimiento: (data: { cashBoxId: number; tipo: string; concepto: string; monto: number; fecha?: string }) =>
    ipcRenderer.invoke('cajas:crearMovimiento', data),
  listarVentas: () => ipcRenderer.invoke('ventas:list'),
  crearVenta: (data: { items: { productId: number; cantidad: number }[]; metodo: string; cajeroId?: number }) =>
    ipcRenderer.invoke('ventas:crear', data),
  listarClientes: () => ipcRenderer.invoke('clientes:listar') as Promise<Customer[]>,
  crearCliente: (data: {
    nombre: string;
    telefono?: string;
    limite?: number;
    saldo?: number;
    estado?: 'activo' | 'inactivo';
  }) => ipcRenderer.invoke('clientes:crear', data),
  actualizarCliente: (data: {
    id: number;
    nombre: string;
    telefono?: string;
    limite?: number;
    saldo?: number;
    estado?: 'activo' | 'inactivo';
  }) => ipcRenderer.invoke('clientes:actualizar', data),
  toggleClienteEstado: (data: { id: number; estado: 'activo' | 'inactivo' }) => ipcRenderer.invoke('clientes:toggleEstado', data)
});

declare global {
  interface Window {
    hedelmia: {
      exportarBackup: (destino: string) => Promise<{ ok: boolean }>;
      listarCatalogo: () => Promise<{ sabores: Flavor[]; productos: Product[]; tipos: ProductType[] }>;
      crearSabor: (data: { nombre: string; color?: string; activo?: boolean }) => Promise<Flavor>;
      crearProducto: (data: {
        tipoId: number;
        saborId: number;
        presentacion: string;
        precio: number;
        costo: number;
        sku?: string;
        stock?: number;
      }) => Promise<Product>;
      listarCajas: () => Promise<CashBox[]>;
      crearMovimiento: (data: { cashBoxId: number; tipo: string; concepto: string; monto: number; fecha?: string }) => Promise<CashMovement>;
      listarVentas: () => Promise<unknown>;
      crearVenta: (data: { items: { productId: number; cantidad: number }[]; metodo: string; cajeroId?: number }) => Promise<unknown>;
      listarClientes: () => Promise<Customer[]>;
      crearCliente: (data: { nombre: string; telefono?: string; limite?: number; saldo?: number; estado?: 'activo' | 'inactivo' }) => Promise<Customer>;
      actualizarCliente: (data: { id: number; nombre: string; telefono?: string; limite?: number; saldo?: number; estado?: 'activo' | 'inactivo' }) => Promise<Customer>;
      toggleClienteEstado: (data: { id: number; estado: 'activo' | 'inactivo' }) => Promise<Customer>;
    };
  }
}
