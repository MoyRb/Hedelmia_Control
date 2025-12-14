import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.fridgeVisitItem.deleteMany();
  await prisma.fridgeVisit.deleteMany();
  await prisma.fridgeAssignment.deleteMany();
  await prisma.fridgeAsset.deleteMany();
  await prisma.creditPayment.deleteMany();
  await prisma.credit.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.cashBox.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.finishedStockMovement.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.rawMaterialMovement.deleteMany();
  await prisma.rawMaterial.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.product.deleteMany();
  await prisma.flavor.deleteMany();
  await prisma.productType.deleteMany();

  const admin = await prisma.user.upsert({
    where: { email: 'admin@hedelmia.local' },
    update: {},
    create: {
      email: 'admin@hedelmia.local',
      nombre: 'Admin',
      password: 'admin123',
      role: 'ADMIN'
    }
  });

  const [tipoPaleta, tipoNieve] = await prisma.$transaction([
    prisma.productType.create({ data: { nombre: 'Paleta' } }),
    prisma.productType.create({ data: { nombre: 'Nieve' } })
  ]);

  const [fresa, mango, coco, nuez] = await prisma.$transaction([
    prisma.flavor.create({ data: { nombre: 'Fresa cremosa', color: '#ff8aa1' } }),
    prisma.flavor.create({ data: { nombre: 'Mango con chile', color: '#ffb347' } }),
    prisma.flavor.create({ data: { nombre: 'Coco', color: '#f5f5f0' } }),
    prisma.flavor.create({ data: { nombre: 'Nuez', color: '#d7c0ae' } })
  ]);

  const productos = await prisma.product.createMany({
    data: [
      { tipoId: tipoPaleta.id, saborId: fresa.id, presentacion: 'pieza', precio: 25, costo: 9, sku: 'PAL-FRE-01', stock: 120 },
      { tipoId: tipoPaleta.id, saborId: mango.id, presentacion: 'pieza', precio: 27, costo: 10, sku: 'PAL-MAN-01', stock: 90 },
      { tipoId: tipoNieve.id, saborId: coco.id, presentacion: 'litro', precio: 120, costo: 55, sku: 'NIE-COC-L', stock: 30 },
      { tipoId: tipoNieve.id, saborId: nuez.id, presentacion: 'medio litro', precio: 70, costo: 32, sku: 'NIE-NUZ-M', stock: 45 }
    ]
  });

  const clientes = await prisma.customer.createMany({
    data: [
      { nombre: 'Cafetería Monarca', telefono: '333-000-0001', limite: 5000, saldo: 1500 },
      { nombre: 'Escuela San Ángel', telefono: '333-000-0002', limite: 3000, saldo: 0 }
    ]
  });

  const cajas = await prisma.cashBox.createMany({
    data: [
      { nombre: 'Caja grande', tipo: 'grande' },
      { nombre: 'Caja chica', tipo: 'chica' }
    ]
  });

  const [cajaGrande, cajaChica] = await prisma.cashBox.findMany({ orderBy: { id: 'asc' } });
  await prisma.cashMovement.createMany({
    data: [
      { cashBoxId: cajaChica.id, tipo: 'ingreso', concepto: 'Venta mostrador', monto: 1200 },
      { cashBoxId: cajaChica.id, tipo: 'egreso', concepto: 'Compra de leche', monto: 320 },
      { cashBoxId: cajaGrande.id, tipo: 'ingreso', concepto: 'Depósito ventas', monto: 800 }
    ]
  });

  const [cliente1] = await prisma.customer.findMany({ orderBy: { id: 'asc' } });
  const credito = await prisma.credit.create({ data: { customerId: cliente1.id, saldo: 2000 } });
  await prisma.creditPayment.create({ data: { creditId: credito.id, monto: 500 } });

  const refri = await prisma.fridgeAsset.create({ data: { modelo: 'Hoshizaki 12', serie: 'HZ-001', estado: 'activo' } });
  await prisma.fridgeAssignment.create({
    data: {
      assetId: refri.id,
      customerId: cliente1.id,
      ubicacion: 'Centro',
      entregadoEn: new Date('2023-10-10'),
      deposito: 2000,
      renta: 450
    }
  });
  const visita = await prisma.fridgeVisit.create({ data: { assetId: refri.id, notas: 'Revisión mensual' } });
  await prisma.fridgeVisitItem.create({ data: { visitId: visita.id, product: 'Paleta surtida', cantidad: 30, devuelto: 2 } });

  const unidadKilo = await prisma.unit.create({ data: { nombre: 'Kilogramo' } });
  const unidadLitro = await prisma.unit.create({ data: { nombre: 'Litro' } });
  const leche = await prisma.rawMaterial.create({ data: { nombre: 'Leche entera', unidadId: unidadLitro.id, stock: 50, costoProm: 18 } });
  const azucar = await prisma.rawMaterial.create({ data: { nombre: 'Azúcar', unidadId: unidadKilo.id, stock: 20, costoProm: 22 } });

  await prisma.rawMaterialMovement.createMany({
    data: [
      { materialId: leche.id, tipo: 'entrada', cantidad: 30, costoTotal: 540 },
      { materialId: leche.id, tipo: 'salida', cantidad: 10, costoTotal: 180 },
      { materialId: azucar.id, tipo: 'entrada', cantidad: 15, costoTotal: 330 }
    ]
  });

  await prisma.finishedStockMovement.createMany({
    data: [
      { productId: 1, tipo: 'entrada', cantidad: 50, referencia: 'Producción inicial' },
      { productId: 1, tipo: 'salida', cantidad: 10, referencia: 'Venta mayorista' },
      { productId: 3, tipo: 'entrada', cantidad: 20, referencia: 'Batch nieve' }
    ]
  });

  console.log('Seed listo', { admin, productos, clientes, cajas });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
