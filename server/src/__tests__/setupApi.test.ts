import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { generateSessionToken } from '../utils/token';
import { AuthenticatedAdmin } from '../types';

describe('Setup API Endpoints (/api/setup)', () => {
  const mockAdmin: AuthenticatedAdmin = {
    id: 'mock-admin-id-123',
    email: 'admin@library.local',
    username: 'admin',
    fullName: 'System Administrator',
    role: 'SUPERADMIN',
  };

  const adminToken = generateSessionToken(mockAdmin);

  it('GET /api/setup/database/status should return sanitized status without disclosing credentials or passwords', async () => {
    const res = await request(app).get('/api/setup/database/status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.connectionStatus).toBeDefined();
    // Security assertion: Password must NEVER be exposed
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.currentConfig?.password).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('POST /api/setup/database/test should fail validation with invalid port or missing fields', async () => {
    const res = await request(app)
      .post('/api/setup/database/test')
      .send({
        host: 'localhost',
        port: 999999, // invalid port
        database: 'library_db',
        // user missing
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
  });

  it('POST /api/setup/database/test should reject SSRF attempts to cloud metadata IP', async () => {
    const res = await request(app)
      .post('/api/setup/database/test')
      .send({
        host: '169.254.169.254',
        port: 5432,
        database: 'library_db',
        user: 'postgres',
        password: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('cloud metadata');
  });

  it('POST /api/setup/database/test should succeed for valid PostgreSQL connection', async () => {
    const res = await request(app)
      .post('/api/setup/database/test')
      .send({
        host: '127.0.0.1',
        port: 5433,
        database: 'library_db',
        user: 'postgres',
        password: '',
        sslMode: 'disable',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reachable).toBe(true);
    expect(res.body.data.latencyMs).toBeGreaterThan(0);
    expect(res.body.data.schemaStatus).toBe('COMPATIBLE');
  });

  it('POST /api/setup/database/connect should require authenticated admin and password verification if already configured', async () => {
    // Attempt without authentication on configured system
    const unauthRes = await request(app)
      .post('/api/setup/database/connect')
      .send({
        host: '127.0.0.1',
        port: 5433,
        database: 'library_db',
        user: 'postgres',
        password: '',
      });

    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.error).toContain('Authentication required');
  });

  it('POST /api/setup/database/disconnect should require authentication', async () => {
    const res = await request(app).post('/api/setup/database/disconnect');
    expect(res.status).toBe(401);
  });
});
