import { Client, ClientConfig } from 'pg';
import { DatabaseCredentials, SslMode, dbConfigManager, buildConnectionString } from '../config/dbConfigManager';
import { reconfigurePrisma } from '../config/prisma';

export interface ConnectionTestResult {
  reachable: boolean;
  latencyMs: number;
  schemaStatus: 'EMPTY' | 'COMPATIBLE' | 'INCOMPATIBLE';
  tableCount: number;
  tables: string[];
  hasAdminUser: boolean;
  privileges: {
    canConnect: boolean;
    canCreate: boolean;
    canUsage: boolean;
  };
  message: string;
  error?: string;
}

export interface ConnectionStatusResponse {
  isConfigured: boolean;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED';
  currentConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
    sslMode: SslMode;
    source: string;
  };
  schemaStatus: 'EMPTY' | 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNKNOWN';
  hasAdmin: boolean;
  tableCount: number;
  lastChecked: string;
}

const FORBIDDEN_HOSTS = [
  '169.254.169.254', // AWS/GCP/Azure link-local metadata
  'fd00:ec2::254',   // AWS IPv6 metadata
  'metadata.google.internal',
  '100.100.100.200', // Alibaba cloud metadata
];

const DISALLOWED_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 3389, 8080, 8443,
];

export function validateHostAndPort(host: string, port: number): { valid: boolean; reason?: string } {
  const normalizedHost = host.trim().toLowerCase();

  // Block SSRF to cloud metadata
  if (FORBIDDEN_HOSTS.includes(normalizedHost)) {
    return { valid: false, reason: 'Connections to cloud metadata services are strictly prohibited.' };
  }

  // Prevent internal link-local probing
  if (normalizedHost.startsWith('169.254.')) {
    return { valid: false, reason: 'Link-local addresses are not permitted.' };
  }

  // Basic host format validation
  const hostRegex = /^[a-zA-Z0-9.-]+$/;
  if (!hostRegex.test(normalizedHost)) {
    return { valid: false, reason: 'Host contains invalid characters.' };
  }

  // Port boundary check
  if (port < 1 || port > 65535) {
    return { valid: false, reason: 'Port must be between 1 and 65535.' };
  }

  // Block non-database sensitive service ports to prevent port-scanning SSRF
  if (DISALLOWED_PORTS.includes(port)) {
    return { valid: false, reason: `Port ${port} is restricted to prevent unauthorized service access.` };
  }

  return { valid: true };
}

export function buildPgClientConfig(creds: DatabaseCredentials, timeoutMs = 6000): ClientConfig {
  const clientConfig: ClientConfig = {
    host: creds.host,
    port: creds.port,
    database: creds.database,
    user: creds.user,
    password: creds.password,
    connectionTimeoutMillis: timeoutMs,
    statement_timeout: 10000,
    query_timeout: 10000,
  };

  if (creds.sslMode === 'require') {
    clientConfig.ssl = { rejectUnauthorized: false };
  } else if (creds.sslMode === 'verify-ca' || creds.sslMode === 'verify-full') {
    clientConfig.ssl = {
      rejectUnauthorized: true,
      ca: creds.sslCa ? creds.sslCa : undefined,
    };
  } else {
    clientConfig.ssl = false;
  }

  return clientConfig;
}

export const EXPECTED_LMS_TABLES = [
  'admins',
  'users',
  'books',
  'book_copies',
  'book_issues',
  'seats',
  'seat_assignments',
  'activity_logs',
  'library_settings',
  'seat_change_requests',
];

/**
 * Test PostgreSQL credentials and inspect schema without saving
 */
export async function testDatabaseConnection(creds: DatabaseCredentials, timeoutMs = 6000): Promise<ConnectionTestResult> {
  const validation = validateHostAndPort(creds.host, creds.port);
  if (!validation.valid) {
    return {
      reachable: false,
      latencyMs: 0,
      schemaStatus: 'INCOMPATIBLE',
      tableCount: 0,
      tables: [],
      hasAdminUser: false,
      privileges: { canConnect: false, canCreate: false, canUsage: false },
      message: validation.reason || 'Invalid database host or port.',
      error: validation.reason,
    };
  }

  const clientConfig = buildPgClientConfig(creds, timeoutMs);
  const client = new Client(clientConfig);

  const startTime = Date.now();

  try {
    await client.connect();
    const latencyMs = Date.now() - startTime;

    // 1. Verify connectivity with SELECT 1
    await client.query('SELECT 1 AS healthcheck');

    // 2. Check user privileges
    const privRes = await client.query(`
      SELECT 
        has_database_privilege(current_user, current_database(), 'CONNECT') AS can_connect,
        has_schema_privilege(current_user, 'public', 'CREATE') AS can_create,
        has_schema_privilege(current_user, 'public', 'USAGE') AS can_usage;
    `);

    const privRow = privRes.rows[0] || {};
    const privileges = {
      canConnect: Boolean(privRow.can_connect),
      canCreate: Boolean(privRow.can_create),
      canUsage: Boolean(privRow.can_usage),
    };

    // 3. Inspect public schema tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `);

    const tableNames: string[] = tablesRes.rows.map((r: any) => r.table_name);
    const tableCount = tableNames.length;

    let schemaStatus: 'EMPTY' | 'COMPATIBLE' | 'INCOMPATIBLE' = 'EMPTY';
    let hasAdminUser = false;

    if (tableCount === 0) {
      schemaStatus = 'EMPTY';
    } else {
      const matchedExpected = EXPECTED_LMS_TABLES.filter((t) => tableNames.includes(t));
      // If contains at least core LMS tables
      if (matchedExpected.length === EXPECTED_LMS_TABLES.length) {
        schemaStatus = 'COMPATIBLE';
      } else if (matchedExpected.length >= 5) {
        schemaStatus = 'COMPATIBLE';
      } else {
        schemaStatus = 'INCOMPATIBLE';
      }

      // Check if admin user exists if admins table is present
      if (tableNames.includes('admins')) {
        try {
          const adminCountRes = await client.query('SELECT COUNT(*) AS count FROM admins');
          hasAdminUser = parseInt(adminCountRes.rows[0]?.count || '0', 10) > 0;
        } catch {
          hasAdminUser = false;
        }
      }
    }

    return {
      reachable: true,
      latencyMs,
      schemaStatus,
      tableCount,
      tables: tableNames,
      hasAdminUser,
      privileges,
      message: `Successfully connected to PostgreSQL database '${creds.database}' (${latencyMs}ms latency).`,
    };
  } catch (err: any) {
    let sanitizedError = 'Unable to establish database connection.';
    if (err.code === 'ECONNREFUSED') {
      sanitizedError = `Connection refused at ${creds.host}:${creds.port}. Ensure PostgreSQL server is running.`;
    } else if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
      sanitizedError = `Connection to ${creds.host}:${creds.port} timed out after ${timeoutMs}ms.`;
    } else if (err.code === '28P01') {
      sanitizedError = 'Authentication failed. Invalid username or password.';
    } else if (err.code === '3D000') {
      sanitizedError = `Database '${creds.database}' does not exist on target PostgreSQL server.`;
    } else if (err.code === 'ENOTFOUND') {
      sanitizedError = `Host '${creds.host}' could not be resolved.`;
    } else if (err.message) {
      sanitizedError = `Connection failed: ${err.message.replace(/password=.+?(?=\s|$)/i, 'password=***')}`;
    }

    return {
      reachable: false,
      latencyMs: 0,
      schemaStatus: 'INCOMPATIBLE',
      tableCount: 0,
      tables: [],
      hasAdminUser: false,
      privileges: { canConnect: false, canCreate: false, canUsage: false },
      message: sanitizedError,
      error: sanitizedError,
    };
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore client closure errors
    }
  }
}

// Global mutex to prevent concurrent reconfiguration
let isReconfigurationInProgress = false;

export async function connectAndApplyDatabase(
  creds: DatabaseCredentials
): Promise<{ success: boolean; message: string; schemaStatus: string; error?: string }> {
  if (isReconfigurationInProgress) {
    throw new Error('Another database configuration change is currently in progress. Please wait.');
  }

  isReconfigurationInProgress = true;

  try {
    // 1. Pre-flight connection test
    const testResult = await testDatabaseConnection(creds);
    if (!testResult.reachable) {
      return {
        success: false,
        message: testResult.message,
        schemaStatus: testResult.schemaStatus,
        error: testResult.error || testResult.message,
      };
    }

    // 2. Backup old configuration
    dbConfigManager.backupCurrentConfig();

    // 3. Save new encrypted configuration
    await dbConfigManager.saveConfig(creds);

    // 4. Reconfigure Prisma runtime client
    const newConnectionString = buildConnectionString(creds);
    await reconfigurePrisma(newConnectionString);

    return {
      success: true,
      message: `Database successfully configured and connected to ${creds.database} on ${creds.host}:${creds.port}.`,
      schemaStatus: testResult.schemaStatus,
    };
  } catch (err: any) {
    console.error('[DbConnectionService] Error applying database configuration:', err);
    // Rollback to previous configuration if available
    await dbConfigManager.rollbackConfig();
    const rollbackUrl = dbConfigManager.getActiveConnectionString();
    if (rollbackUrl) {
      try {
        await reconfigurePrisma(rollbackUrl);
      } catch (rollbackErr) {
        console.error('[DbConnectionService] Rollback reconfiguration error:', rollbackErr);
      }
    }

    return {
      success: false,
      message: 'Failed to switch database configuration. Previous configuration preserved.',
      schemaStatus: 'UNKNOWN',
      error: err.message || 'Configuration error',
    };
  } finally {
    isReconfigurationInProgress = false;
  }
}

/**
 * Get current system connection status
 */
export async function getLiveDatabaseStatus(): Promise<ConnectionStatusResponse> {
  const sanitized = dbConfigManager.getSanitizedConfig();
  const activeCreds = dbConfigManager.getActiveCredentials();

  if (!sanitized.isConfigured || !activeCreds) {
    return {
      isConfigured: false,
      connectionStatus: 'NOT_CONFIGURED',
      currentConfig: {
        host: '',
        port: 5432,
        database: '',
        user: '',
        sslMode: 'disable',
        source: 'none',
      },
      schemaStatus: 'UNKNOWN',
      hasAdmin: false,
      tableCount: 0,
      lastChecked: new Date().toISOString(),
    };
  }

  // Perform quick health check with current credentials
  const testRes = await testDatabaseConnection(activeCreds, 3000);

  return {
    isConfigured: true,
    connectionStatus: testRes.reachable ? 'CONNECTED' : 'DISCONNECTED',
    currentConfig: {
      host: sanitized.host,
      port: sanitized.port,
      database: sanitized.database,
      user: sanitized.user,
      sslMode: sanitized.sslMode,
      source: sanitized.source,
    },
    schemaStatus: testRes.reachable ? testRes.schemaStatus : 'UNKNOWN',
    hasAdmin: testRes.hasAdminUser,
    tableCount: testRes.tableCount,
    lastChecked: new Date().toISOString(),
  };
}
