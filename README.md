# Hedelmiá POS (Electron + React + Prisma)

Aplicación de escritorio estilo POS para la paletería/nevería **Hedelmiá**. Incluye módulos de catálogo, inventarios, ventas, finanzas, créditos, refris y dashboard analítico.

## Supuestos base
- Sin IVA por defecto (configurable).
- Una sola sucursal.
- Impresión genérica de tickets (sin cajón dedicado).
- Nieve por litro/medio litro y paleta por pieza.
- Recetas opcionales; si no existen, se permiten ajustes manuales.
- Pagaré genérico.
- Stock negativo bloqueado salvo rol Admin.

## Requerimientos
- Node.js 18+
- SQLite (incluido) y Prisma CLI (`npx prisma`)

## Instalación
```bash
npm install
```

## Desarrollo
En dos terminales (o usando `npm run dev`):
```bash
npm run dev:renderer  # Vite + React
npm run dev:main      # Electron main con ts-node-dev
```
La app cargará en `http://localhost:5173` dentro de la ventana Electron.

## Build instalador
```bash
npm run build
npm run dist
```
El instalador se genera con electron-builder.

## Base de datos y seed
```bash
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
```
El admin inicial es `admin@hedelmia.local` / `admin123`.

## Respaldo y export
- IPC `backup:export` copia el archivo `hedelmia.db` a la ruta indicada.
- Puede extenderse para CSV/Excel desde el proceso main.

## Datos demo
Vienen en el seed: sabores, productos, clientes, cajas y usuario Admin.

## Pruebas rápidas
1. Ejecuta `npm run seed` para crear/actualizar la base SQLite con los catálogos iniciales.
2. Arranca el entorno con `npm run dev` y abre la vista de Catálogo, Finanzas y Ventas.
3. Agrega un sabor y un producto desde Catálogo y verifica que persistan tras recargar.
4. Registra un ingreso o gasto en cada caja y revisa que los totales se actualicen.
5. Arma un carrito en Ventas, usa **Cobrar / Guardar venta** y confirma que se vacíe al guardar.

## Checklist de MVP
- [x] Tema pastel Hedelmiá + layout POS.
- [x] Dashboard con gráficas de ventas y sabores.
- [x] POS rápido con carrito y totales.
- [x] Catálogo (sabores/productos) y clientes.
- [x] Inventario de producto terminado.
- [x] Finanzas (cajas) y movimientos demo.
- [x] Créditos y refris (listas básicas).
- [x] Prisma schema + seed + handlers IPC iniciales.
- [ ] Autenticación completa con roles y permisos UI.
- [ ] CRUD completos con formularios y validación Zod.
- [ ] Producción desde recetas con consumo automático.
- [ ] Import/export CSV y backups automatizados.
- [ ] Reportes PDF de pagarés y tickets.

## Fase 2 sugerida
- Integrar lector de código de barras y atajos de teclado globales.
- Añadir auditoría detallada por módulo.
- Optimizar POS para pantallas táctiles con modo kiosco.
- Sincronización opcional entre sucursales (si aplica futuro multi-sucursal).
