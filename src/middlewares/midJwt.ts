import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import config from '../config/config';
import { tokenExtractor } from '../helpers/headers';
import { BlackList } from 'jwt-blacklist';

export const checkJwt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tokens = tokenExtractor(req);
    const blackList = <BlackList>res.app.locals.blackList;
    jwt.verify(tokens.baseToken, config.jwtSecret);
    const tokenBanned = await blackList.has(tokens.baseToken);
    if (tokenBanned) {
      throw new Error('Token is banned');
    }
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'invalid token' });
    return;
  }
  next();
};

export const checkRefresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const tokens = tokenExtractor(req);
    const blackList = <BlackList>res.app.locals.blackList;
    jwt.verify(tokens.refreshToken, config.jwtRefreshSecret);
    const tokenBanned = await blackList.has(tokens.refreshToken);
    if (tokenBanned) {
      throw new Error('Refresh token is banned');
    }
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'invalid refresh token' });
    return;
  }
  next();
};

export const cancelJwt = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const tokens = tokenExtractor(req);
  const blackList = <BlackList>res.app.locals.blackList;
  if (blackList && tokens.baseToken) {
    await blackList.add(tokens.baseToken);
  }
  next();
};

export const cancelRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const tokens = tokenExtractor(req);
  const blackList = <BlackList>res.app.locals.blackList;
  if (blackList) {
    if (tokens.refreshToken) {
      await blackList.add(tokens.refreshToken);
    }
  }
  next();
};
