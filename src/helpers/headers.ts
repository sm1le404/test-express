import { Request } from 'express';

export const tokenExtractor = (req: Request) => {
  let baseToken: string;
  let refreshToken: string;
  if (req.headers.authorization) {
    baseToken = req.headers.authorization.split(' ')[1];
  }
  if (req.headers['x-auth-refresh-token']) {
    refreshToken = req.headers['x-auth-refresh-token'].toString();
  } else {
    refreshToken = req.cookies['refresh-token'];
  }
  return { baseToken, refreshToken };
};
