import { Router } from 'express';
import * as controller from '../controllers/report.controller';
import { authGuard } from '../middleware/auth';

const router = Router();

router.use(authGuard);

router.get('/inventory', controller.getInventoryReport);
router.get('/ebooks', controller.getEbooksReport);
router.get('/borrowed-books', controller.getBorrowedBooksReport);
router.get('/history', controller.getHistoryReport);
router.get('/seat-occupancy', controller.getSeatOccupancyReport);

export default router;
