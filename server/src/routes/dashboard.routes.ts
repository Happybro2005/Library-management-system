import { Router } from 'express';
import { getStats, getActivity } from '../controllers/dashboard.controller';
import { authGuard } from '../middleware/auth';

const router = Router();

router.use(authGuard);

router.get('/stats', getStats);
router.get('/activity', getActivity);

export default router;
