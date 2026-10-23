import { Router } from 'express';
import { getSettings, updateSettings, updateSettingsSchema } from '../controllers/settings.controller';
import { authGuard } from '../middleware/auth';
import { validateBody } from '../middleware/validator';

const router = Router();

router.use(authGuard);

router.get('/', getSettings);
router.put('/', validateBody(updateSettingsSchema), updateSettings);

export default router;
