import { PrismaClient } from '@prisma/client';
import { config } from './index';
import { dbConfigManager } from './dbConfigManager';

declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var activePrismaUrl: string | undefined;
}

function getInitialDatabaseUrl(): string {
  const configured = dbConfigManager.getActiveConnectionString();
  if (configured) {
    return configured;
  }
  return config.databaseUrl || 'postgresql://postgres@localhost:5433/library_db?schema=public';
}

function createPrismaClient(url: string): PrismaClient {
  return new PrismaClient({
    datasourceUrl: url,
    log: config.isProduction ? ['error', 'warn'] : ['warn', 'error'],
  });
}

let currentUrl = global.activePrismaUrl || getInitialDatabaseUrl();
let activeClient: PrismaClient = global.prismaInstance || createPrismaClient(currentUrl);

if (!config.isProduction) {
  global.prismaInstance = activeClient;
  global.activePrismaUrl = currentUrl;
}

/**
 * Proxy wrapper so any module importing `prisma` always targets the active database client
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const value = Reflect.get(activeClient, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  },
});

/**
 * Safely switch Prisma to a new database URL
 */
export async function reconfigurePrisma(newUrl: string): Promise<void> {
  const nextClient = createPrismaClient(newUrl);

  // Validate the new client before replacing the existing one
  try {
    await nextClient.$connect();
    await nextClient.$queryRawUnsafe('SELECT 1');
  } catch (err) {
    await nextClient.$disconnect().catch(() => {});
    throw new Error(`Prisma connection test failed for new database: ${(err as Error).message}`);
  }

  // Gracefully disconnect previous client
  const oldClient = activeClient;
  try {
    await oldClient.$disconnect();
  } catch (err) {
    console.warn('[Prisma] Error disconnecting old Prisma client:', err);
  }

  activeClient = nextClient;
  currentUrl = newUrl;

  if (!config.isProduction) {
    global.prismaInstance = activeClient;
    global.activePrismaUrl = currentUrl;
  }

  console.log('[Prisma] Runtime database client successfully switched.');
}

/**
 * Disconnect active client cleanly
 */
export async function disconnectPrisma(): Promise<void> {
  if (activeClient) {
    await activeClient.$disconnect();
  }
}

export function getCurrentPrismaUrl(): string {
  return currentUrl;
}
