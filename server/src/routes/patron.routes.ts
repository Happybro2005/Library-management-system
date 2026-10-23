import { Router } from 'express';
import * as controller from '../controllers/patron.controller';
import { patronAuthGuard, authGuard } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validator';

const router = Router();

// Public Patron Auth
router.post('/login', loginRateLimiter, validateBody(controller.patronLoginSchema), controller.login);

// Admin-Initiated Direct Patron Preview (Requires Admin Session)
router.post('/admin-view', authGuard, validateBody(controller.adminViewPatronSchema), controller.adminViewPatron);

// Protected Patron Routes
router.use(patronAuthGuard);

router.post('/logout', controller.logout);
router.post('/change-password', validateBody(controller.changePasswordSchema), controller.changePassword);
router.get('/me', controller.getMe);
router.get('/dashboard', controller.getDashboard);
router.get('/catalog', controller.getCatalog);
router.get('/ebooks', controller.getEbooks);
router.get('/ebooks/:bookId/stream', controller.streamEbook);
router.get('/seats', controller.getSeats);
router.get('/available-seats', controller.getAvailableSeats);
router.post('/change-seat', validateBody(controller.changeSeatSchema), controller.changeSeat);
router.post('/seat/request', validateBody(controller.requestSeatChangeSchema), controller.requestSeatChange);
router.post('/seat/request/:requestId/cancel', controller.cancelSeatChange);
router.get('/seat/requests', controller.getSeatRequests);

export default router;
