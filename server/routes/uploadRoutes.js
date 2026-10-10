import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createUploadMiddleware } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// General file upload endpoint
router.post(
  '/',
  requireAuth,
  createUploadMiddleware({
    fieldName: 'file',
    folder: 'nexus/general',
    maxSize: 15 * 1024 * 1024 // 15MB
  }),
  (req, res) => {
    res.status(200).json({
      message: 'File uploaded successfully',
      url: req.fileUrl,
      publicId: req.filePublicId,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  }
);

export default router;
