import express, { Router } from 'express';
import { uploadMiddleware } from '../middlewares/upload';
import { config } from '../config';

const router = Router();

// Handle file upload
router.post('/', uploadMiddleware);

// Serve static files from public upload directory
router.use('/', express.static(config.publicPath));

export const uploadRouter = router;
