import express from 'express';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { uploadLibraryMiddleware } from '../middlewares/uploadMiddleware.js';
import * as libraryController from '../controllers/libraryController.js';

const router = express.Router();

router.use(requireAuth);

// Admin upload library resource (T8.3)
router.post(
  '/',
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
  uploadLibraryMiddleware,
  libraryController.uploadResource
);

// Everyone views library resources (T8.3)
router.get(
  '/',
  libraryController.getResources
);

// Admin deletes library resource
router.delete(
  '/:id',
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
  libraryController.deleteResource
);

export default router;
