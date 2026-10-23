import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../types';
import { dbConfigManager, SslMode } from '../config/dbConfigManager';
import {
  testDatabaseConnection,
  connectAndApplyDatabase,
  getLiveDatabaseStatus,
} from '../services/dbConnection.service';
import { initializeDatabaseSchema, seedDemoData } from '../services/dbMigration.service';
import { prisma, disconnectPrisma } from '../config/prisma';
import { verifyPassword, hashPassword } from '../utils/password';
import { logActivity } from '../services/audit.service';

export const testConnectionSchema = z.object({
  host: z.string().trim().min(1, 'Host is required').max(255),
  port: z.coerce.number().int().min(1, 'Port must be between 1 and 65535').max(65535).default(5432),
  database: z
    .string()
    .trim()
    .min(1, 'Database name is required')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Database name contains invalid characters'),
  user: z
    .string()
    .trim()
    .min(1, 'Username is required')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username contains invalid characters'),
  password: z.string().default(''),
  sslMode: z.enum(['disable', 'require', 'verify-ca', 'verify-full']).default('disable'),
  sslCa: z.string().optional(),
});

export const connectDatabaseSchema = testConnectionSchema.extend({
  adminPassword: z.string().optional(),
  confirmSwitch: z.boolean().optional(),
});

export const createFirstAdminSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_.-]+$/, 'Username contains invalid characters'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

/**
 * Check if the current system has any admin configured
 */
async function systemHasAdmin(): Promise<boolean> {
  try {
    const adminCount = await prisma.admin.count();
    return adminCount > 0;
  } catch {
    return false;
  }
}

/**
 * GET /api/setup/database/status & GET /api/setup/status
 * Returns safe connection status without disclosing sensitive data
 */
export async function getStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await getLiveDatabaseStatus();
    const hasAdmin = await systemHasAdmin();

    res.json({
      success: true,
      data: {
        ...status,
        hasAdmin,
        isFirstRun: !status.isConfigured || !hasAdmin,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/setup/database/test
 * Test connection credentials without saving
 */
export async function testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { host, port, database, user, password, sslMode, sslCa } = req.body;

    const result = await testDatabaseConnection({
      host,
      port,
      database,
      user,
      password,
      sslMode: sslMode as SslMode,
      sslCa,
    });

    if (!result.reachable) {
      res.status(400).json({
        success: false,
        error: result.message,
        details: {
          latencyMs: 0,
          reachable: false,
          schemaStatus: result.schemaStatus,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        reachable: true,
        latencyMs: result.latencyMs,
        schemaStatus: result.schemaStatus,
        tableCount: result.tableCount,
        tables: result.tables,
        hasAdminUser: result.hasAdminUser,
        privileges: result.privileges,
        message: result.message,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/setup/database/connect
 * Validate credentials, save encrypted configuration, and reconfigure Prisma
 */
export async function connectDatabase(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { host, port, database, user, password, sslMode, sslCa, adminPassword } = req.body;

    const hasAdmin = await systemHasAdmin();
    const isConfigured = dbConfigManager.isConfigured();

    // Reauthentication Guard:
    // If the system is already configured with an admin, require an authenticated administrator session
    // AND require the administrator to verify their password before switching.
    if (isConfigured && hasAdmin) {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          error: 'Authentication required to modify active database configuration.',
        });
        return;
      }

      if (!adminPassword) {
        res.status(400).json({
          success: false,
          error: 'Current administrator password confirmation is required to switch database configuration.',
        });
        return;
      }

      // Verify current admin password
      const currentAdmin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
      if (!currentAdmin) {
        res.status(401).json({ success: false, error: 'Current admin record not found.' });
        return;
      }

      const isValidPass = await verifyPassword(adminPassword, currentAdmin.passwordHash);
      if (!isValidPass) {
        res.status(403).json({ success: false, error: 'Incorrect administrator password confirmation.' });
        return;
      }
    }

    // Connect and apply new configuration
    const result = await connectAndApplyDatabase({
      host,
      port,
      database,
      user,
      password,
      sslMode: sslMode as SslMode,
      sslCa,
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.message,
        details: { schemaStatus: result.schemaStatus },
      });
      return;
    }

    if (req.admin) {
      await logActivity({
        actorId: req.admin.id,
        actorName: req.admin.fullName,
        actionType: 'DATABASE_RECONFIGURED',
        entityType: 'SystemConfig',
        entityId: 'database',
        metadata: { host, port, database, sslMode },
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        schemaStatus: result.schemaStatus,
        isConfigured: true,
        host,
        port,
        database,
        sslMode,
      },
    });
  } catch (err: any) {
    next(err);
  }
}

/**
 * POST /api/setup/database/initialize
 * Run schema DDL on an empty or uninitialized database
 */
export async function initializeSchema(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const hasAdmin = await systemHasAdmin();
    const isConfigured = dbConfigManager.isConfigured();

    if (isConfigured && hasAdmin && !req.admin) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    const result = await initializeDatabaseSchema();

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.message,
        steps: result.steps,
      });
      return;
    }

    if (req.admin) {
      await logActivity({
        actorId: req.admin.id,
        actorName: req.admin.fullName,
        actionType: 'DATABASE_INITIALIZED',
        entityType: 'SystemConfig',
        entityId: 'schema',
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: result.message,
      steps: result.steps,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/setup/database/seed
 * Seed demo data when explicitly requested
 */
export async function seedDatabase(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const hasAdmin = await systemHasAdmin();
    if (hasAdmin && !req.admin) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    const result = await seedDemoData();

    if (!result.success) {
      res.status(400).json({ success: false, error: result.message });
      return;
    }

    if (req.admin) {
      await logActivity({
        actorId: req.admin.id,
        actorName: req.admin.fullName,
        actionType: 'DATABASE_SEEDED',
        entityType: 'SystemConfig',
        entityId: 'demo_data',
        metadata: result.details,
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: result.message,
      details: result.details,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/setup/database/disconnect
 * Safely disconnects current database if permitted
 */
export async function disconnectDatabase(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.admin) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    await disconnectPrisma();
    dbConfigManager.clearConfig();

    await logActivity({
      actorId: req.admin.id,
      actorName: req.admin.fullName,
      actionType: 'DATABASE_DISCONNECTED',
      entityType: 'SystemConfig',
      entityId: 'database',
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Database disconnected successfully. System is now unconfigured.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/setup/admin
 * Create initial administrator during first-run setup flow
 */
export async function createFirstAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hasAdmin = await systemHasAdmin();
    if (hasAdmin) {
      res.status(400).json({
        success: false,
        error: 'Administrator already exists. First-run admin creation is disabled.',
      });
      return;
    }

    const { fullName, email, username, password } = req.body;

    const passwordHash = await hashPassword(password);

    const admin = await prisma.admin.create({
      data: {
        fullName,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        role: 'SUPERADMIN',
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Primary administrator account created successfully. You may now log in.',
      data: admin,
    });
  } catch (err: any) {
    next(err);
  }
}
