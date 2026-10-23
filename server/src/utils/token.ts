import crypto from 'crypto';
import { config } from '../config';
import { AuthenticatedAdmin, AuthenticatedPatron } from '../types';

interface TokenPayload {
  admin: AuthenticatedAdmin;
  issuedAt: number;
  expiresAt: number;
}

interface PatronTokenPayload {
  patron: AuthenticatedPatron;
  issuedAt: number;
  expiresAt: number;
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateSessionToken(admin: AuthenticatedAdmin): string {
  const now = Date.now();
  const payload: TokenPayload = {
    admin,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  const payloadString = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payloadString)
    .digest('base64url');

  return `${payloadString}.${signature}`;
}

export function verifySessionToken(token: string): AuthenticatedAdmin | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadString, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(payloadString)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadString, 'base64url').toString('utf-8')
    );

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload.admin;
  } catch {
    return null;
  }
}

export function generatePatronToken(patron: AuthenticatedPatron): string {
  const now = Date.now();
  const payload: PatronTokenPayload = {
    patron,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  const payloadString = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.sessionSecret)
    .update(payloadString)
    .digest('base64url');

  return `${payloadString}.${signature}`;
}

export function verifyPatronToken(token: string): AuthenticatedPatron | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadString, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(payloadString)
      .digest('base64url');

    const sigBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payload: PatronTokenPayload = JSON.parse(
      Buffer.from(payloadString, 'base64url').toString('utf-8')
    );

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload.patron;
  } catch {
    return null;
  }
}
