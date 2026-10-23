import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config as appConfig } from './index';

export type SslMode = 'disable' | 'require' | 'verify-ca' | 'verify-full';

export interface DatabaseCredentials {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  sslMode: SslMode;
  sslCa?: string;
  updatedAt?: string;
}

export interface SanitizedDatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  sslMode: SslMode;
  hasPassword: boolean;
  hasSslCa: boolean;
  isConfigured: boolean;
  source: 'encrypted_file' | 'env' | 'none';
  updatedAt?: string;
}

const CONFIG_DIR = path.resolve(__dirname, '../../data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'db-credentials.enc.json');
const BACKUP_FILE = path.join(CONFIG_DIR, 'db-credentials.backup.enc.json');

// Derive 32-byte encryption key from environment secrets
function getEncryptionKey(): Buffer {
  const secret = process.env.DB_ENCRYPTION_KEY || appConfig.sessionSecret || 'lms-fallback-secret-key-32-chars-min';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt sensitive string payload using AES-256-GCM
 */
export function encryptPayload(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    tag: authTag.toString('hex'),
    content: encrypted,
  });
}

/**
 * Decrypt sensitive string payload using AES-256-GCM
 */
export function decryptPayload(encryptedJson: string): string {
  const { iv, tag, content } = JSON.parse(encryptedJson);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Parse standard PostgreSQL URL into structured DatabaseCredentials
 */
export function parsePostgresUrl(urlStr: string): DatabaseCredentials {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname || 'localhost';
    const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
    const user = decodeURIComponent(parsed.username || 'postgres');
    const password = decodeURIComponent(parsed.password || '');
    const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'postgres';
    
    const sslParam = parsed.searchParams.get('sslmode');
    let sslMode: SslMode = 'disable';
    if (sslParam === 'require') sslMode = 'require';
    else if (sslParam === 'verify-ca') sslMode = 'verify-ca';
    else if (sslParam === 'verify-full') sslMode = 'verify-full';
    else if (sslParam === 'no-verify' || parsed.searchParams.get('ssl') === 'true') sslMode = 'require';

    return {
      host,
      port,
      database,
      user,
      password,
      sslMode,
    };
  } catch {
    return {
      host: 'localhost',
      port: 5432,
      database: 'library_db',
      user: 'postgres',
      password: '',
      sslMode: 'disable',
    };
  }
}

/**
 * Build standard PostgreSQL connection string from DatabaseCredentials
 */
export function buildConnectionString(creds: DatabaseCredentials): string {
  const encodedUser = encodeURIComponent(creds.user);
  const encodedPass = creds.password ? encodeURIComponent(creds.password) : '';
  const authPart = encodedPass ? `${encodedUser}:${encodedPass}` : encodedUser;
  
  let url = `postgresql://${authPart}@${creds.host}:${creds.port}/${creds.database}?schema=public`;

  if (creds.sslMode && creds.sslMode !== 'disable') {
    url += `&sslmode=${creds.sslMode}`;
  }

  return url;
}

class DbConfigManager {
  private activeConfig: DatabaseCredentials | null = null;
  private backupConfig: DatabaseCredentials | null = null;
  private source: 'encrypted_file' | 'env' | 'none' = 'none';

  constructor() {
    this.initializeFromStorage();
  }

  public initializeFromStorage(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
        const decryptedJson = decryptPayload(fileContent);
        this.activeConfig = JSON.parse(decryptedJson);
        this.source = 'encrypted_file';
        return;
      }
    } catch (err) {
      console.warn('[DbConfigManager] Failed to read encrypted config file:', err);
    }

    // Fall back to environment variable DATABASE_URL if available
    if (process.env.DATABASE_URL) {
      this.activeConfig = parsePostgresUrl(process.env.DATABASE_URL);
      this.source = 'env';
      return;
    }

    this.activeConfig = null;
    this.source = 'none';
  }

  public isConfigured(): boolean {
    return this.activeConfig !== null && Boolean(this.activeConfig.host && this.activeConfig.database && this.activeConfig.user);
  }

  public getActiveCredentials(): DatabaseCredentials | null {
    if (!this.activeConfig) return null;
    return { ...this.activeConfig };
  }

  public getActiveConnectionString(): string | null {
    if (!this.activeConfig) return null;
    return buildConnectionString(this.activeConfig);
  }

  public getSanitizedConfig(): SanitizedDatabaseConfig {
    if (!this.activeConfig) {
      return {
        host: '',
        port: 5432,
        database: '',
        user: '',
        sslMode: 'disable',
        hasPassword: false,
        hasSslCa: false,
        isConfigured: false,
        source: 'none',
      };
    }

    return {
      host: this.activeConfig.host,
      port: this.activeConfig.port,
      database: this.activeConfig.database,
      user: this.activeConfig.user,
      sslMode: this.activeConfig.sslMode,
      hasPassword: Boolean(this.activeConfig.password && this.activeConfig.password.length > 0),
      hasSslCa: Boolean(this.activeConfig.sslCa && this.activeConfig.sslCa.length > 0),
      isConfigured: true,
      source: this.source,
      updatedAt: this.activeConfig.updatedAt,
    };
  }

  public backupCurrentConfig(): void {
    if (this.activeConfig) {
      this.backupConfig = { ...this.activeConfig };
      try {
        if (!fs.existsSync(CONFIG_DIR)) {
          fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        const encrypted = encryptPayload(JSON.stringify(this.activeConfig));
        fs.writeFileSync(BACKUP_FILE, encrypted, 'utf8');
      } catch (err) {
        console.warn('[DbConfigManager] Failed to write backup config file:', err);
      }
    }
  }

  public async saveConfig(credentials: DatabaseCredentials): Promise<void> {
    const credsWithTimestamp: DatabaseCredentials = {
      ...credentials,
      updatedAt: new Date().toISOString(),
    };

    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }

    const encrypted = encryptPayload(JSON.stringify(credsWithTimestamp));
    fs.writeFileSync(CONFIG_FILE, encrypted, { encoding: 'utf8', mode: 0o600 });

    this.activeConfig = credsWithTimestamp;
    this.source = 'encrypted_file';
  }

  public async rollbackConfig(): Promise<boolean> {
    if (this.backupConfig) {
      await this.saveConfig(this.backupConfig);
      return true;
    }

    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const fileContent = fs.readFileSync(BACKUP_FILE, 'utf8');
        const decryptedJson = decryptPayload(fileContent);
        const restored: DatabaseCredentials = JSON.parse(decryptedJson);
        await this.saveConfig(restored);
        return true;
      }
    } catch (err) {
      console.error('[DbConfigManager] Rollback failed:', err);
    }

    return false;
  }

  public clearConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        fs.unlinkSync(CONFIG_FILE);
      }
      if (fs.existsSync(BACKUP_FILE)) {
        fs.unlinkSync(BACKUP_FILE);
      }
    } catch (err) {
      console.warn('[DbConfigManager] Error removing config files:', err);
    }

    this.activeConfig = null;
    this.source = 'none';
  }
}

export const dbConfigManager = new DbConfigManager();
