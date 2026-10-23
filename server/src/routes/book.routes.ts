import { Router } from 'express';
import * as controller from '../controllers/book.controller';
import { authGuard } from '../middleware/auth';
import { validateBody } from '../middleware/validator';
import { uploadCover } from '../middleware/upload';

const router = Router();

router.use(authGuard);

router.get('/', controller.listBooks);
router.post('/', validateBody(controller.createBookSchema), controller.createBook);
router.get('/:id', controller.getBook);
router.put('/:id', validateBody(controller.updateBookSchema), controller.updateBook);
router.delete('/:id', controller.archiveBook);

// Physical Copies
router.post('/:bookId/copies', validateBody(controller.addCopySchema), controller.addCopy);
router.put('/copies/:id', validateBody(controller.updateCopySchema), controller.updateCopy);

// Cover image upload
router.post('/upload-cover', uploadCover.single('cover'), controller.uploadCoverImage);

export default router;
