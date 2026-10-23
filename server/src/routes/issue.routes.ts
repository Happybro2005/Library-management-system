import { Router } from 'express';
import * as controller from '../controllers/issue.controller';
import { authGuard } from '../middleware/auth';
import { validateBody } from '../middleware/validator';

const router = Router();

router.use(authGuard);

router.get('/', controller.listIssues);
router.post('/issue', validateBody(controller.issueBookSchema), controller.issueBook);
router.post('/:id/return', validateBody(controller.returnBookSchema), controller.returnBook);

export default router;
