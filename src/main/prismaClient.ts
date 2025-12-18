type PrismaClient = import('@prisma/client').PrismaClient;
type PrismaModule = typeof import('@prisma/client');

let prisma: PrismaClient | null = null;
let prismaModule: PrismaModule | null = null;

const getPrismaModule = (): PrismaModule => {
  if (!prismaModule) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    prismaModule = require('@prisma/client');
  }
  return prismaModule as PrismaModule;
};

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    const { PrismaClient: PrismaClientConstructor } = getPrismaModule();
    prisma = new PrismaClientConstructor();
  }
  return prisma;
};

export type Prisma = PrismaModule['Prisma'];
