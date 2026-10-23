import { Router } from 'express';
import { listActivityLogs } from '../controllers/activity.controller';
import { authGuard } from '../middleware/auth';

const router = Router();

router.use(authGuard);

router.get('/', listActivityLogs);

export default router;
