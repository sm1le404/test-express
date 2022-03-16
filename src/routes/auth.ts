import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import {
  checkJwt,
  cancelJwt,
  checkRefresh,
  cancelRefreshToken,
} from '../middlewares/midJwt';

const router = Router();

router.post('/signin', AuthController.login);
router.post('/signup', AuthController.signUp);
router.get('/info', [checkJwt], AuthController.info);

router.get(
  '/logout',
  [checkJwt, cancelJwt, cancelRefreshToken],
  AuthController.logout,
);

router.get(
  '/signin/new_token',
  [checkRefresh, cancelJwt],
  AuthController.getToken,
);

export default router;
