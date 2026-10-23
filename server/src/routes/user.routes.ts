import { Router } from 'express';
import * as controller from '../controllers/user.controller';
import { authGuard } from '../middleware/auth';
import { validateBody } from '../middleware/validator';

const router = Router();

router.use(authGuard);

router.get('/', controller.listUsers);
router.post('/', validateBody(controller.createUserSchema), controller.createUser);
router.get('/:id', controller.getUser);
router.put('/:id', validateBody(controller.updateUserSchema), controller.updateUser);
router.post('/:id/reset-password', validateBody(controller.resetPasswordSchema), controller.resetPassword);

export default router;
