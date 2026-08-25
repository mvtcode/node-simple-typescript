import express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { uploadRouter } from './routes/upload.route';

const app = express();

// Ensure public upload folder exists
if (!fs.existsSync(config.publicPath)) {
  fs.mkdirSync(config.publicPath, { recursive: true });
}

// Serve demo UI at root GET /
const demoHtmlPath = path.resolve(config.publicPath, 'index.html');
app.get('/', (_req, res) => {
  if (fs.existsSync(demoHtmlPath)) {
    res.sendFile(demoHtmlPath);
  } else {
    res.send('File Upload Service is running. Access /api/upload to upload files.');
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount upload and file serving router
app.use(config.basePath, uploadRouter);

const server = app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
  console.log(`Upload endpoint: http://localhost:${config.port}${config.basePath}`);
  console.log(`Static file directory: ${config.publicPath}`);
});

export default app;
export { server };
