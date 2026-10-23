import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptPayload,
  decryptPayload,
  buildConnectionString,
  parsePostgresUrl,
  dbConfigManager,
  DatabaseCredentials,
} from '../config/dbConfigManager';

describe('dbConfigManager - Secure Storage and Cryptography', () => {
  const sampleCreds: DatabaseCredentials = {
    host: 'localhost',
    port: 5433,
    database: 'library_db',
    user: 'postgres',
    password: 'MyUltraSecretPassword123!',
    sslMode: 'disable',
  };

  afterEach(() => {
    dbConfigManager.clearConfig();
  });

  it('should encrypt and decrypt payloads with AES-256-GCM authenticated cipher', () => {
    const raw = JSON.stringify(sampleCreds);
    const encrypted = encryptPayload(raw);

    expect(encrypted).not.toContain('MyUltraSecretPassword123!');
    expect(encrypted).toContain('"iv"');
    expect(encrypted).toContain('"tag"');

    const decrypted = decryptPayload(encrypted);
    expect(decrypted).toBe(raw);
    const parsed = JSON.parse(decrypted);
    expect(parsed.password).toBe('MyUltraSecretPassword123!');
  });

  it('should properly build standard PostgreSQL connection strings', () => {
    const connStr = buildConnectionString(sampleCreds);
    expect(connStr).toBe('postgresql://postgres:MyUltraSecretPassword123!@localhost:5433/library_db?schema=public');

    const sslCreds: DatabaseCredentials = {
      ...sampleCreds,
      sslMode: 'require',
    };
    const sslConnStr = buildConnectionString(sslCreds);
    expect(sslConnStr).toBe('postgresql://postgres:MyUltraSecretPassword123!@localhost:5433/library_db?schema=public&sslmode=require');
  });

  it('should parse PostgreSQL connection strings into structured credentials', () => {
    const url = 'postgresql://admin_user:secret_pass@db.example.com:5432/custom_db?schema=public&sslmode=require';
    const parsed = parsePostgresUrl(url);

    expect(parsed.host).toBe('db.example.com');
    expect(parsed.port).toBe(5432);
    expect(parsed.database).toBe('custom_db');
    expect(parsed.user).toBe('admin_user');
    expect(parsed.password).toBe('secret_pass');
    expect(parsed.sslMode).toBe('require');
  });

  it('should save encrypted configuration to disk and retrieve sanitized data without password', async () => {
    await dbConfigManager.saveConfig(sampleCreds);

    expect(dbConfigManager.isConfigured()).toBe(true);

    const sanitized = dbConfigManager.getSanitizedConfig();
    expect(sanitized.host).toBe('localhost');
    expect(sanitized.port).toBe(5433);
    expect(sanitized.database).toBe('library_db');
    expect(sanitized.user).toBe('postgres');
    expect(sanitized.hasPassword).toBe(true);
    // CRITICAL: password property must not exist in sanitized output
    expect((sanitized as any).password).toBeUndefined();

    const activeCreds = dbConfigManager.getActiveCredentials();
    expect(activeCreds?.password).toBe('MyUltraSecretPassword123!');
  });

  it('should support backup and rollback on configuration update', async () => {
    await dbConfigManager.saveConfig(sampleCreds);
    dbConfigManager.backupCurrentConfig();

    const newCreds: DatabaseCredentials = {
      ...sampleCreds,
      database: 'new_library_db',
      password: 'NewChangedPassword',
    };
    await dbConfigManager.saveConfig(newCreds);

    expect(dbConfigManager.getActiveCredentials()?.database).toBe('new_library_db');

    const restored = await dbConfigManager.rollbackConfig();
    expect(restored).toBe(true);
    expect(dbConfigManager.getActiveCredentials()?.database).toBe('library_db');
    expect(dbConfigManager.getActiveCredentials()?.password).toBe('MyUltraSecretPassword123!');
  });
});
