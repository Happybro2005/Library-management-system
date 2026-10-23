import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifySessionToken, verifyPatronToken } from '../utils/token';

export const SESSION_COOKIE_NAME = 'lms_session';
export const PATRON_SESSION_COOKIE_NAME = 'lms_patron_session';

export function authGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
    return;
  }

  const admin = verifySessionToken(token);
  if (!admin) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please log in again.',
    });
    return;
  }

  req.admin = admin;
  next();
}

export function patronAuthGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token = req.cookies?.[PATRON_SESSION_COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Patron authentication required. Please sign in with your Membership ID.',
    });
    return;
  }

  const patron = verifyPatronToken(token);
  if (!patron) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired patron session. Please sign in again.',
    });
    return;
  }

  req.patron = patron;
  next();
}

export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.admin || req.admin.role !== 'SUPERADMIN') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Superadmin privileges required.',
    });
    return;
  }
  next();
}

export function eitherAuthGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token = req.cookies?.[SESSION_COOKIE_NAME] || req.cookies?.[PATRON_SESSION_COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
    });
    return;
  }

  const admin = verifySessionToken(token);
  if (admin) {
    req.admin = admin;
    return next();
  }

  const patron = verifyPatronToken(token);
  if (patron) {
    req.patron = patron;
    return next();
  }

  res.status(401).json({
    success: false,
    error: 'Invalid or expired session. Please log in again.',
  });
}
