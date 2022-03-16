import { Router } from 'express';
import StoreController from '../controllers/StoreController';
import { checkJwt } from '../middlewares/midJwt';

const router = Router();

router.post('/upload', [checkJwt], StoreController.upload);
router.get('/list', [checkJwt], StoreController.getList);
router.get('/:id', StoreController.getById);
router.put('/update/:id', [checkJwt], StoreController.update);
router.delete('/delete/:id', [checkJwt], StoreController.delete);
router.get('/download/:id', StoreController.download);

export default router;
