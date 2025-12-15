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

export type Unit = { id: number; nombre: string };
export type RawMaterialMovement = {
  id: number;
  materialId: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  costoTotal: number;
  createdAt: string;
};

export type RawMaterial = {
  id: number;
  nombre: string;
  stock: number;
  costoProm: number;
  unidad: Unit;
  movimientos?: RawMaterialMovement[];
};

export type FinishedStockMovement = {
  id: number;
  productId: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  referencia?: string | null;
  createdAt: string;
};

export type CashMovement = { id: number; cashBoxId: number; tipo: string; concepto: string; monto: number; fecha: string };
export type CashBox = { id: number; nombre: string; tipo: string; movimientos: CashMovement[] };

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
  listarMaterias: () =>
    ipcRenderer.invoke('inventario:listarMaterias') as Promise<{ materias: RawMaterial[]; unidades: Unit[] }>,
  crearUnidad: (data: { nombre: string }) => ipcRenderer.invoke('inventario:crearUnidad', data) as Promise<Unit>,
  crearMateria: (data: { nombre: string; unidadId: number; stock?: number; costoProm?: number }) =>
    ipcRenderer.invoke('inventario:crearMateria', data) as Promise<RawMaterial>,
  movimientoMateria: (data: {
    materialId: number;
    tipo: 'entrada' | 'salida';
    cantidad: number;
    costoTotal?: number;
  }) => ipcRenderer.invoke('inventario:movimientoMateria', data) as Promise<RawMaterial>,
  listarProductosStock: () =>
    ipcRenderer.invoke('inventario:listarProductosStock') as Promise<(Product & { stockMoves?: FinishedStockMovement[] })[]>,
  movimientoProducto: (data: {
    productId: number;
    tipo: 'entrada' | 'salida';
    cantidad: number;
    referencia?: string;
  }) => ipcRenderer.invoke('inventario:movimientoProducto', data) as Promise<Product & { stockMoves?: FinishedStockMovement[] }>
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
      listarMaterias: () => Promise<{ materias: RawMaterial[]; unidades: Unit[] }>;
      crearUnidad: (data: { nombre: string }) => Promise<Unit>;
      crearMateria: (data: { nombre: string; unidadId: number; stock?: number; costoProm?: number }) => Promise<RawMaterial>;
      movimientoMateria: (data: {
        materialId: number;
        tipo: 'entrada' | 'salida';
        cantidad: number;
        costoTotal?: number;
      }) => Promise<RawMaterial>;
      listarProductosStock: () => Promise<(Product & { stockMoves?: FinishedStockMovement[] })[]>;
      movimientoProducto: (data: {
        productId: number;
        tipo: 'entrada' | 'salida';
        cantidad: number;
        referencia?: string;
      }) => Promise<Product & { stockMoves?: FinishedStockMovement[] }>;
    };
  }
}
