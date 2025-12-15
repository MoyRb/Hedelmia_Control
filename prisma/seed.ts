import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'file:./prisma/hedelmia.db';
const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.cashBox.deleteMany();
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

  const tipoPaleta = await prisma.productType.upsert({
    where: { id: 1 },
    update: {},
    create: { nombre: 'Paleta' }
  });

  const tipoNieve = await prisma.productType.upsert({
    where: { id: 2 },
    update: {},
    create: { nombre: 'Nieve' }
  });

  const fresa = await prisma.flavor.create({ data: { nombre: 'Fresa cremosa', color: '#ff8aa1' } });
  const mango = await prisma.flavor.create({ data: { nombre: 'Mango con chile', color: '#ffb347' } });
  const coco = await prisma.flavor.create({ data: { nombre: 'Coco', color: '#f5f5f0' } });

  const unidadKg = await prisma.unit.create({ data: { nombre: 'Kg' } });
  const unidadLitro = await prisma.unit.create({ data: { nombre: 'Litro' } });
  const unidadPieza = await prisma.unit.create({ data: { nombre: 'Pieza' } });

  const leche = await prisma.rawMaterial.create({
    data: { nombre: 'Leche entera', unidadId: unidadLitro.id, stock: 50, costoProm: 18.4 }
  });
  const azucar = await prisma.rawMaterial.create({
    data: { nombre: 'Azúcar refinada', unidadId: unidadKg.id, stock: 25, costoProm: 12 }
  });
  const palitos = await prisma.rawMaterial.create({
    data: { nombre: 'Palitos de madera', unidadId: unidadPieza.id, stock: 500, costoProm: 0.5 }
  });

  await prisma.rawMaterialMovement.createMany({
    data: [
      { materialId: leche.id, tipo: 'entrada', cantidad: 30, costoTotal: 540 },
      { materialId: leche.id, tipo: 'entrada', cantidad: 20, costoTotal: 380 },
      { materialId: azucar.id, tipo: 'entrada', cantidad: 15, costoTotal: 180 },
      { materialId: azucar.id, tipo: 'entrada', cantidad: 10, costoTotal: 120 },
      { materialId: palitos.id, tipo: 'entrada', cantidad: 500, costoTotal: 250 }
    ]
  });

  const paletaFresa = await prisma.product.create({
    data: {
      tipoId: tipoPaleta.id,
      saborId: fresa.id,
      presentacion: 'pieza',
      precio: 25,
      costo: 9,
      sku: 'PAL-FRE-01',
      stock: 120
    }
  });
  const paletaMango = await prisma.product.create({
    data: {
      tipoId: tipoPaleta.id,
      saborId: mango.id,
      presentacion: 'pieza',
      precio: 27,
      costo: 10,
      sku: 'PAL-MAN-01',
      stock: 90
    }
  });
  const nieveCoco = await prisma.product.create({
    data: {
      tipoId: tipoNieve.id,
      saborId: coco.id,
      presentacion: 'litro',
      precio: 120,
      costo: 55,
      sku: 'NIE-COC-L',
      stock: 40
    }
  });

  await prisma.finishedStockMovement.createMany({
    data: [
      { productId: paletaFresa.id, tipo: 'entrada', cantidad: 100, referencia: 'Producción matutina' },
      { productId: paletaFresa.id, tipo: 'salida', cantidad: 30, referencia: 'Pedido mayorista' },
      { productId: paletaMango.id, tipo: 'entrada', cantidad: 80, referencia: 'Lote con chile' },
      { productId: paletaMango.id, tipo: 'salida', cantidad: 20, referencia: 'Merma' },
      { productId: nieveCoco.id, tipo: 'entrada', cantidad: 40, referencia: 'Producción especial' }
    ]
  });

  await prisma.customer.createMany({
    data: [
      { nombre: 'Cafetería Monarca', telefono: '333-000-0001', limite: 5000, saldo: 1500 },
      { nombre: 'Escuela San Ángel', telefono: '333-000-0002', limite: 3000, saldo: 0 }
    ]
  });

  await prisma.cashBox.createMany({
    data: [
      { nombre: 'Caja grande', tipo: 'grande' },
      { nombre: 'Caja chica', tipo: 'chica' }
    ]
  });

  console.log('Seed listo', { admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
