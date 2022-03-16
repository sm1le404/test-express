import { Router } from 'express';
import auth from './auth';
import store from './store';

const routes = Router();
routes.use('/', auth);
routes.use('/file/', store);

export default routes;
