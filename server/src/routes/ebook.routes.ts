import { Router } from 'express';
import * as controller from '../controllers/ebook.controller';
import { authGuard } from '../middleware/auth';
import { uploadEbook } from '../middleware/upload';

const router = Router();

router.use(authGuard);

router.get('/', controller.listEbooks);
router.post('/:bookId/upload', uploadEbook.single('file'), controller.uploadEbookFile);
router.get('/:bookId/stream', controller.readEbookFile);

export default router;
