import 'reflect-metadata';
import { createConnection } from 'typeorm';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import * as cors from 'cors';
import routes from './routes';
import * as fileUpload from 'express-fileupload';
import { createBlackList } from 'jwt-blacklist';
import * as cookieParser from 'cookie-parser';

createConnection()
  .then(async (connection) => {
    const app = express();
    app.locals.blackList = await createBlackList({
      daySize: 10000,
      errorRate: 0.001,
    });
    app.use(cookieParser());
    app.use(cors());
    app.use(helmet());
    app.use(bodyParser.json());
    app.use(fileUpload());
    app.use('/', routes);
    app.use((req, res, next) => {
      res.status(404).json({ status: false, message: 'invalid request' });
    });
    app.listen(3000, () => {
      console.log('App started');
    });
  })
  .catch((error) => console.log(error));
