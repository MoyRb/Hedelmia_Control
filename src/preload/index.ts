import { contextBridge, ipcRenderer } from 'electron';

export type Flavor = { id: number; nombre: string; color?: string | null; activo: boolean };
export type ProductType = { id: number; nombre: string; activo: boolean };
export type Product = {
  id: number;
  sku?: string | null;
  presentacion: string;
  precio: number;
  costo: number;
  stock: number;
  activo: boolean;
  tipoId?: number;
  saborId?: number;
  tipo: ProductType;
  sabor: Flavor;
};

export type CashMovement = { id: number; cashBoxId: number; tipo: string; concepto: string; monto: number; fecha: string };
export type CashBox = { id: number; nombre: string; tipo: string; movimientos: CashMovement[] };

contextBridge.exposeInMainWorld('hedelmia', {
  exportarBackup: (destino: string) => ipcRenderer.invoke('backup:export', destino),
  listarCatalogo: () => ipcRenderer.invoke('catalogo:listar') as Promise<{ sabores: Flavor[]; productos: Product[]; tipos: ProductType[] }>,
  crearTipo: (data: { nombre: string; activo?: boolean }) => ipcRenderer.invoke('catalogo:crearTipo', data),
  crearSabor: (data: { nombre: string; color?: string; activo?: boolean }) => ipcRenderer.invoke('catalogo:crearSabor', data),
  actualizarSabor: (data: { id: number; nombre?: string; color?: string | null; activo?: boolean }) =>
    ipcRenderer.invoke('catalogo:actualizarSabor', data),
  crearProducto: (data: {
    tipoId: number;
    saborId: number;
    presentacion: string;
    precio: number;
    costo: number;
    sku?: string;
    stock?: number;
  }) => ipcRenderer.invoke('catalogo:crearProducto', data),
  actualizarProducto: (data: {
    id: number;
    tipoId?: number;
    saborId?: number;
    presentacion?: string;
    precio?: number;
    costo?: number;
    sku?: string | null;
    stock?: number;
    activo?: boolean;
  }) => ipcRenderer.invoke('catalogo:actualizarProducto', data),
  actualizarTipo: (data: { id: number; nombre?: string; activo?: boolean }) => ipcRenderer.invoke('catalogo:actualizarTipo', data),
  listarCajas: () => ipcRenderer.invoke('cajas:listarMovimientos') as Promise<CashBox[]>,
  crearMovimiento: (data: { cashBoxId: number; tipo: string; concepto: string; monto: number; fecha?: string }) =>
    ipcRenderer.invoke('cajas:crearMovimiento', data),
  listarVentas: () => ipcRenderer.invoke('ventas:list'),
  crearVenta: (data: { items: { productId: number; cantidad: number }[]; metodo: string; cajeroId?: number }) =>
    ipcRenderer.invoke('ventas:crear', data)
});

declare global {
  interface Window {
    hedelmia: {
      exportarBackup: (destino: string) => Promise<{ ok: boolean }>;
      listarCatalogo: () => Promise<{ sabores: Flavor[]; productos: Product[]; tipos: ProductType[] }>;
      crearTipo: (data: { nombre: string; activo?: boolean }) => Promise<ProductType>;
      crearSabor: (data: { nombre: string; color?: string; activo?: boolean }) => Promise<Flavor>;
      actualizarSabor: (data: { id: number; nombre?: string; color?: string | null; activo?: boolean }) => Promise<Flavor>;
      crearProducto: (data: {
        tipoId: number;
        saborId: number;
        presentacion: string;
        precio: number;
        costo: number;
        sku?: string;
        stock?: number;
      }) => Promise<Product>;
      actualizarProducto: (data: {
        id: number;
        tipoId?: number;
        saborId?: number;
        presentacion?: string;
        precio?: number;
        costo?: number;
        sku?: string | null;
        stock?: number;
        activo?: boolean;
      }) => Promise<Product>;
      actualizarTipo: (data: { id: number; nombre?: string; activo?: boolean }) => Promise<ProductType>;
      listarCajas: () => Promise<CashBox[]>;
      crearMovimiento: (data: { cashBoxId: number; tipo: string; concepto: string; monto: number; fecha?: string }) => Promise<CashMovement>;
      listarVentas: () => Promise<unknown>;
      crearVenta: (data: { items: { productId: number; cantidad: number }[]; metodo: string; cajeroId?: number }) => Promise<unknown>;
    };
  }
}
