import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const port = parseInt(process.env.APP_PORT || '3000', 10);
const basePath = (process.env.APP_BASE_PATH || '/api/upload').replace(/\/+$/, '') || '/api/upload';
const rawPublicPath = process.env.PUBLIC_PATH || 'public';
const publicPath = path.isAbsolute(rawPublicPath)
  ? rawPublicPath
  : path.resolve(process.cwd(), rawPublicPath);

export const config = {
  port,
  basePath,
  rawPublicPath,
  publicPath,
};
