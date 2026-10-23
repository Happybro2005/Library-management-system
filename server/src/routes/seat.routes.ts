import { Router } from 'express';
import * as controller from '../controllers/seat.controller';
import { authGuard, eitherAuthGuard } from '../middleware/auth';
import { validateBody } from '../middleware/validator';

const router = Router();

// Allow both administrators and library patrons to view the seats map
router.get('/', eitherAuthGuard, controller.getSeats);

// Administrator Seat Change Requests Management
router.get('/requests', authGuard, controller.getSeatRequests);
router.post('/requests/:requestId/approve', authGuard, validateBody(controller.reviewRequestSchema), controller.approveSeatRequest);
router.post('/requests/:requestId/reject', authGuard, validateBody(controller.reviewRequestSchema), controller.rejectSeatRequest);

// Administrator-only seat modifications
router.post('/assign', authGuard, validateBody(controller.assignSeatSchema), controller.assignSeat);
router.post('/:seatId/release', authGuard, controller.releaseSeat);
router.put('/:seatId/status', authGuard, validateBody(controller.updateSeatStatusSchema), controller.updateSeatStatus);
router.post('/adjust-capacity', authGuard, validateBody(controller.adjustCapacitySchema), controller.adjustCapacity);

export default router;
