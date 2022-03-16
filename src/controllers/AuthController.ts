import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { getRepository } from 'typeorm';
import { User } from '../entity/User';
import config from '../config/config';
import { tokenExtractor } from '../helpers/headers';
import validator from 'validator';

class AuthController {
  private static generateTokens = (user: User) => {
    const token = jwt.sign(
      { id: user.id, extId: user.extId },
      config.jwtSecret,
      { expiresIn: '10m' },
    );

    const refreshToken = jwt.sign({ id: user.id }, config.jwtRefreshSecret, {
      expiresIn: '10h',
    });

    return { token, refreshToken };
  };

  static login = async (req: Request, res: Response) => {
    const { id, password } = req.body;
    if (!(id && password)) {
      res
        .status(400)
        .json({ status: 'error', message: 'id or password not found' });
      return;
    }

    const userRepository = getRepository(User);
    let user: User;
    try {
      user = await userRepository.findOneOrFail({ where: { extId: id } });
    } catch (error) {
      res.status(401).json({ status: 'error', message: 'user not found' });
    }

    if (!user.checkIfUnencryptedPasswordIsValid(password)) {
      res
        .status(401)
        .json({ status: 'error', message: 'try again, check password' });
      return;
    }

    await userRepository.update(user.id, { lastLogin: new Date() });

    const newTokens = this.generateTokens(user);
    res
      .status(200)
      .setHeader('Authorization', `Bearer ${newTokens.token}`)
      .cookie('refresh-token', newTokens.refreshToken)
      .json({
        status: 'success',
        'access-token': newTokens.token,
        'refresh-token': newTokens.refreshToken,
      });
  };

  static signUp = async (req: Request, res: Response) => {
    const { id, password, firstName, lastName } = req.body;

    const userRepository = getRepository(User);
    let user: User;

    if (!(id && password)) {
      res
        .status(400)
        .send({ status: 'error', message: 'fields id & password is required' });
    }

    if (!validator.isEmail(id) && !validator.isMobilePhone(id)) {
      res.status(400).send({
        status: 'error',
        message: 'you can use for id email or phone',
      });
    }

    try {
      user = await userRepository.findOne({ where: { extId: id } });
      if (user) {
        res.status(401).json({
          status: 'error',
          message: `user ${user.extId} already exists`,
        });
      } else {
        user = await userRepository.create({
          extId: id,
          pwd: password,
          firstName,
          lastName,
        });
        user.hashPassword();
        const saveResult = await userRepository.save(user);
        if (saveResult.extId) {
          const newTokens = this.generateTokens(saveResult);
          res
            .status(200)
            .setHeader('Authorization', `Bearer ${newTokens.token}`)
            .cookie('refresh-token', newTokens.refreshToken)
            .json({
              status: 'success',
              'access-token': newTokens.token,
              'refresh-token': newTokens.refreshToken,
            });
        }
      }
    } catch (error) {
      res.status(401).json({ status: 'error', message: error.toString() });
    }
  };

  static logout = async (req: Request, res: Response) => {
    res
      .status(200)
      .setHeader('Authorization', '')
      .setHeader('X-Auth-Refresh-Token', '')
      .json({ status: 'success', message: 'logout done' });
  };

  static getToken = async (req: Request, res: Response) => {
    const tokens = tokenExtractor(req);
    const { id } = jwt.decode(tokens.refreshToken);
    try {
      const userRepository = getRepository(User);
      const user: User = await userRepository.findOne({ where: { id } });
      if (user) {
        const token = jwt.sign(
          { id: user.id, extId: user.extId },
          config.jwtSecret,
          { expiresIn: '10m' },
        );
        res.status(200).setHeader('Authorization', `Bearer ${token}`).json({
          status: 'success',
          'access-token': token,
        });
      } else {
        throw new Error('user not found');
      }
    } catch (error) {
      res.status(401).json({ status: 'error', message: error.toString() });
    }
  };

  static info = async (req: Request, res: Response) => {
    const tokens = tokenExtractor(req);
    const { extId } = jwt.decode(tokens.baseToken);
    res.status(200).json({ status: 'success', id: extId });
  };
}
export default AuthController;
