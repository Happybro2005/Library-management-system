import { Router, Response, NextFunction } from 'express';
import {
  getStatus,
  testConnection,
  connectDatabase,
  initializeSchema,
  seedDatabase,
  disconnectDatabase,
  createFirstAdmin,
  testConnectionSchema,
  connectDatabaseSchema,
  createFirstAdminSchema,
} from '../controllers/setup.controller';
import { authGuard, SESSION_COOKIE_NAME } from '../middleware/auth';
import { setupRateLimiter, loginRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validator';
import { AuthenticatedRequest } from '../types';
import { verifySessionToken } from '../utils/token';

const router = Router();

// Middleware that optionally attaches the admin to req if a session is present
function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  let token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }
  if (token) {
    const admin = verifySessionToken(token);
    if (admin) {
      req.admin = admin;
    }
  }
  next();
}

// 1. Connection status checks
router.get('/status', getStatus);
router.get('/database/status', getStatus);

// 2. Test connection without saving
router.post(
  '/database/test',
  setupRateLimiter,
  validateBody(testConnectionSchema),
  testConnection
);

// 3. Connect and save configuration
router.post(
  '/database/connect',
  setupRateLimiter,
  optionalAuth,
  validateBody(connectDatabaseSchema),
  connectDatabase
);

// 4. Initialize schema on target database
router.post('/database/initialize', optionalAuth, initializeSchema);

// 5. Seed demo data
router.post('/database/seed', optionalAuth, seedDatabase);

// 6. Disconnect database
router.post('/database/disconnect', authGuard, disconnectDatabase);

// 7. Provision primary admin during first-run
router.post(
  '/admin',
  loginRateLimiter,
  validateBody(createFirstAdminSchema),
  createFirstAdmin
);

export default router;
