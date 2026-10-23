import { describe, it, expect } from 'vitest';
import {
  validateHostAndPort,
  testDatabaseConnection,
  buildPgClientConfig,
} from '../services/dbConnection.service';

describe('dbConnection.service - Security & Connectivity', () => {
  describe('SSRF and Host/Port Validation', () => {
    it('should block AWS/GCP/Azure metadata IP address', () => {
      const res = validateHostAndPort('169.254.169.254', 5432);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('cloud metadata');
    });

    it('should block link-local network ranges', () => {
      const res = validateHostAndPort('169.254.1.1', 5432);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Link-local');
    });

    it('should reject invalid ports below 1 or above 65535', () => {
      expect(validateHostAndPort('localhost', 0).valid).toBe(false);
      expect(validateHostAndPort('localhost', 70000).valid).toBe(false);
    });

    it('should reject sensitive ports used by other services (SSH, SMTP, HTTP, etc.) to prevent port-scanning SSRF', () => {
      expect(validateHostAndPort('10.0.0.1', 22).valid).toBe(false);
      expect(validateHostAndPort('10.0.0.1', 80).valid).toBe(false);
      expect(validateHostAndPort('10.0.0.1', 443).valid).toBe(false);
    });

    it('should allow valid PostgreSQL hosts and ports', () => {
      expect(validateHostAndPort('localhost', 5432).valid).toBe(true);
      expect(validateHostAndPort('127.0.0.1', 5433).valid).toBe(true);
      expect(validateHostAndPort('postgres.internal-network.com', 5432).valid).toBe(true);
    });
  });

  describe('PostgreSQL Driver Connection & Timeout', () => {
    it('should successfully test connection to the active local PostgreSQL database', async () => {
      const result = await testDatabaseConnection({
        host: '127.0.0.1',
        port: 5433,
        database: 'library_db',
        user: 'postgres',
        password: '',
        sslMode: 'disable',
      });

      expect(result.reachable).toBe(true);
      expect(result.latencyMs).toBeGreaterThan(0);
      expect(result.privileges.canConnect).toBe(true);
      expect(result.schemaStatus).toBe('COMPATIBLE');
      expect(result.tableCount).toBeGreaterThanOrEqual(9);
      expect(result.hasAdminUser).toBe(true);
      expect(result.message).toContain('Successfully connected');
    });

    it('should handle unavailable host or connection timeout gracefully without crashing', async () => {
      // Connect to non-routable IP with 1000ms timeout
      const result = await testDatabaseConnection(
        {
          host: '192.0.2.1', // TEST-NET-1 (non-routable documentation IP)
          port: 5432,
          database: 'library_db',
          user: 'postgres',
          password: 'pass',
          sslMode: 'disable',
        },
        1000
      );

      expect(result.reachable).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should handle connection refused on inactive port gracefully', async () => {
      const result = await testDatabaseConnection({
        host: '127.0.0.1',
        port: 5439, // Port not listening
        database: 'library_db',
        user: 'postgres',
        password: '',
        sslMode: 'disable',
      });

      expect(result.reachable).toBe(false);
      expect(result.message).toContain('Connection refused');
    });

    it('should handle non-existent database gracefully', async () => {
      const result = await testDatabaseConnection({
        host: '127.0.0.1',
        port: 5433,
        database: 'non_existent_database_99999',
        user: 'postgres',
        password: '',
        sslMode: 'disable',
      });

      expect(result.reachable).toBe(false);
      expect(result.message).toContain('does not exist');
    });
  });
});
