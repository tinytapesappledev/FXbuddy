import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { authMiddleware } from '../auth/middleware';
import { isS3Enabled, uploadToS3, getS3Key } from '../services/s3.service';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `${fileId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only video files are accepted.`));
    }
  },
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max for images
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only image files (PNG, JPG, WebP, SVG) are accepted.`));
    }
  },
});

const router = Router();

router.use(authMiddleware);

/**
 * POST /api/upload
 * Upload a video file for processing.
 * Returns: { fileId, filename, path, size }
 */
router.post('/', (req: Request, res: Response, next) => {
  upload.single('video')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'File too large. Maximum size is 500MB.' });
        return;
      }
      res.status(400).json({ error: err.message || 'Upload failed' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' });
      return;
    }

    const fileId = path.basename(req.file.filename, path.extname(req.file.filename));

    console.log(`[Upload] File received: ${req.file.originalname} -> ${req.file.filename} (${(req.file.size / 1024 / 1024).toFixed(1)}MB)`);

    if (isS3Enabled()) {
      const s3Key = getS3Key('upload', req.file.filename);
      uploadToS3(req.file.path, s3Key).catch((err) => {
        console.warn(`[Upload] S3 backup upload failed: ${err.message}`);
      });
    }

    res.json({
      fileId,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
    });
  });
});

/**
 * POST /api/upload/image
 * Upload an image file (for motion graphics logos, etc.).
 * Returns: { fileId, filename, url }
 */
router.post('/image', (req: Request, res: Response) => {
  imageUpload.single('image')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'Image too large. Maximum size is 20MB.' });
        return;
      }
      res.status(400).json({ error: err.message || 'Upload failed' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
    const imageUrl = `/api/uploads/${req.file.filename}`;

    console.log(`[Upload] Image received: ${req.file.originalname} -> ${req.file.filename} (${(req.file.size / 1024).toFixed(0)}KB) url=${imageUrl}`);

    if (isS3Enabled()) {
      const ext = path.extname(req.file.filename).toLowerCase();
      const mimeMap: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
      const s3Key = getS3Key('upload', req.file.filename);
      uploadToS3(req.file.path, s3Key, mimeMap[ext] || 'application/octet-stream').catch((err) => {
        console.warn(`[Upload] S3 image backup failed: ${err.message}`);
      });
    }

    res.json({
      fileId,
      filename: req.file.filename,
      url: imageUrl,
    });
  });
});

export default router;
