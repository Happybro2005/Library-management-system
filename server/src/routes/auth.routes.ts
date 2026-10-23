import { Router } from 'express';
import { login, logout, getMe, changePassword, loginSchema, changePasswordSchema } from '../controllers/auth.controller';
import { authGuard } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validator';

const router = Router();

router.post('/login', loginRateLimiter, validateBody(loginSchema), login);
router.post('/logout', authGuard, logout);
router.get('/me', authGuard, getMe);
router.post('/change-password', authGuard, validateBody(changePasswordSchema), changePassword);

export default router;
