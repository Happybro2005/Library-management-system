import { describe, it, expect } from 'vitest';
import { initializeDatabaseSchema, LMS_SCHEMA_DDL } from '../services/dbMigration.service';
import { testDatabaseConnection } from '../services/dbConnection.service';

describe('dbMigration.service - Schema Initialization & Compatibility', () => {
  it('should include full DDL for all 9 models and enum types', () => {
    expect(LMS_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS "admins"');
    expect(LMS_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(LMS_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS "books"');
    expect(LMS_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS "book_copies"');
    expect(LMS_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS "book_issues"');
    expect(LMS_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS "seats"');
    expect(LMS_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS "seat_assignments"');
    expect(LMS_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS "activity_logs"');
    expect(LMS_SCHEMA_DDL).toContain('CREATE TABLE IF NOT EXISTS "library_settings"');
    expect(LMS_SCHEMA_DDL).toContain('CREATE TYPE "Role"');
    expect(LMS_SCHEMA_DDL).toContain('CREATE TYPE "UserStatus"');
  });

  it('should detect existing compatible LMS schema and not drop or damage data', async () => {
    const creds = {
      host: '127.0.0.1',
      port: 5433,
      database: 'library_db',
      user: 'postgres',
      password: '',
      sslMode: 'disable' as const,
    };

    const res = await initializeDatabaseSchema(creds);
    expect(res.success).toBe(true);
    expect(res.message).toContain('already initialized');

    // Confirm that tables and records still exist intact
    const verify = await testDatabaseConnection(creds);
    expect(verify.schemaStatus).toBe('COMPATIBLE');
    expect(verify.hasAdminUser).toBe(true);
  });
});
