import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { getRepository } from 'typeorm';
import * as fs from 'fs';
import { User } from '../entity/User';
import { Store } from '../entity/Store';
import { tokenExtractor } from '../helpers/headers';
import * as path from 'path';
import { UploadedFile } from 'express-fileupload';

class StoreController {
  static readonly baseDir = './upload';

  private static getUserByRequest = async (req: Request): Promise<User> => {
    const userRepository = getRepository(User);
    const tokens = tokenExtractor(req);
    const { id, extId } = jwt.decode(tokens.baseToken);
    const user = await userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('user not found');
    }
    return user;
  };

  private static getFileByRequest = async (
    req: Request,
    checkUser = true,
  ): Promise<Store> => {
    const storeRepository = getRepository(Store);
    const fileId = req.params.id;
    const filter: { owner?: User; id: string | number } = {
      id: fileId,
    };
    if (checkUser) {
      const user = await this.getUserByRequest(req);
      filter.owner = user;
    }
    const file = await storeRepository.findOne({
      where: filter,
      relations: ['owner'],
    });

    if (!file) {
      throw new Error('file not found');
    }
    return file;
  };

  static upload = async (req: Request, res: Response) => {
    try {
      const storeRepository = getRepository(Store);
      const user = await this.getUserByRequest(req);
      const uploadedFile: UploadedFile | UploadedFile[] = req.files.file;
      const userDir = `${this.baseDir}/${user.id}`;
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      if (!uploadedFile || uploadedFile instanceof Array) {
        throw new Error('file doesnt exist in request');
      }
      const extension = path.extname(uploadedFile.name);
      const newFilePath = `${userDir}/${uploadedFile.md5}.${extension}`;
      if (fs.existsSync(newFilePath)) {
        throw Error('file already loaded');
      }
      await uploadedFile.mv(newFilePath);
      const storeFile = await storeRepository.create({
        name: uploadedFile.name,
        size: uploadedFile.size,
        extension,
        path: newFilePath,
        type: uploadedFile.mimetype,
        owner: user,
      });
      storeRepository
        .save(storeFile)
        .then((storeItem) => {
          res.status(200).json({
            status: 'success',
            message: 'file successfuly upload',
            file: {
              id: storeFile.id,
              path: storeItem.path,
            },
          });
        })
        .catch(() => {
          fs.unlinkSync(newFilePath);
          throw Error('file save error');
        });
    } catch (error) {
      res.status(401).json({ status: 'error', message: error.toString() });
    }
  };

  static getById = async (req: Request, res: Response) => {
    try {
      const file = await this.getFileByRequest(req);
      res.status(200).json({ status: 'success', fileInfo: file });
    } catch (error) {
      res.status(401).json({ status: 'error', message: error.toString() });
    }
  };

  static getList = async (req: Request, res: Response) => {
    try {
      const user = await this.getUserByRequest(req);
      let list_size = req.query.list_size;
      let page = req.query.page;
      if (list_size instanceof Array) {
        throw new Error('wrong list_size param');
      }
      if (page instanceof Array) {
        throw new Error('wrong page param');
      }
      list_size = Number(list_size) > 0 ? list_size : '10';
      page = Number(page) > 0 ? page : '1';
      const pageParams: { size: number; page: number } = {
        size: Number(list_size),
        page: Number(page),
      };
      const storeRepository = getRepository(Store);
      const [dataList, totalCount] = await storeRepository.findAndCount({
        where: { owner: user },
        skip: (pageParams.page - 1) * pageParams.size,
        take: pageParams.size,
      });

      res.status(200).json({
        status: 'success',
        items: dataList,
        nav: {
          currentPage: pageParams.page,
          pageSize: pageParams.size,
          pageCount: Math.round(Number(totalCount) / pageParams.size),
        },
      });
    } catch (error) {
      res.status(401).json({ status: 'error', message: error.toString() });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const file = await this.getFileByRequest(req);
      const user = await this.getUserByRequest(req);
      const storeRepository = getRepository(Store);

      const userDir = `${this.baseDir}/${user.id}`;
      const oldFilePath = file.path;

      if (!file) {
        throw new Error('file doesnt exist in db');
      }
      if (!fs.existsSync(oldFilePath)) {
        throw new Error('old file doesnt exist in file system');
      }

      const uploadedFile = req.files.file;
      if (!uploadedFile || uploadedFile instanceof Array) {
        throw new Error('file doesnt exist in request');
      }

      const extension = path.extname(uploadedFile.name);
      const newFilePath = `${userDir}/${uploadedFile.md5}.${extension}`;
      if (fs.existsSync(newFilePath)) {
        throw Error('file already loaded');
      }
      await uploadedFile.mv(newFilePath);
      const fileInfo = {
        name: uploadedFile.name,
        size: uploadedFile.size,
        extension,
        path: newFilePath,
        type: uploadedFile.mimetype,
      };

      storeRepository.update(file.id, fileInfo).then(() => {
        fs.unlinkSync(oldFilePath);
        res
          .status(200)
          .json({ status: 'success', message: 'file successfully updated' });
      });
    } catch (error) {
      res.status(401).json({ status: 'error', message: error.toString() });
    }
  };
  static delete = async (req: Request, res: Response) => {
    try {
      const file = await this.getFileByRequest(req);
      const storeRepository = getRepository(Store);
      fs.unlinkSync(file.path);
      storeRepository.delete(file.id).then(() => {
        res
          .status(200)
          .json({ status: 'success', message: 'file was deleted' });
      });
    } catch (error) {
      res.status(401).json({ status: 'error', message: error.toString() });
    }
  };
  static download = async (req: Request, res: Response) => {
    try {
      const file = await this.getFileByRequest(req, false);
      const data = fs.readFileSync(file.path, 'binary');
      res
        .status(200)
        .setHeader('Content-Length', file.size)
        .setHeader('Content-Type', file.type)
        .setHeader('Content-Disposition', 'attachment; filename=' + file.name)
        .write(data);
      res.end();
    } catch (error) {
      res.status(401).json({ status: 'error', message: error.toString() });
    }
  };
}
export default StoreController;
