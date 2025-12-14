import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.cashBox.deleteMany();
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

  await prisma.product.createMany({
    data: [
      { tipoId: tipoPaleta.id, saborId: fresa.id, presentacion: 'pieza', precio: 25, costo: 9, sku: 'PAL-FRE-01' },
      { tipoId: tipoPaleta.id, saborId: mango.id, presentacion: 'pieza', precio: 27, costo: 10, sku: 'PAL-MAN-01' },
      { tipoId: tipoNieve.id, saborId: coco.id, presentacion: 'litro', precio: 120, costo: 55, sku: 'NIE-COC-L' }
    ]
  });

  await prisma.customer.createMany({
    data: [
      { nombre: 'Cafetería Monarca', telefono: '333-000-0001', limite: 5000, saldo: 1500 },
      { nombre: 'Escuela San Ángel', telefono: '333-000-0002', limite: 3000, saldo: 0 },
      { nombre: 'Eventos Luna', telefono: '333-000-0003', limite: 2000, saldo: 800 },
      { nombre: 'Cocina Doña Mary', telefono: '333-000-0004', limite: 3500, saldo: 0, estado: 'inactivo' }
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
