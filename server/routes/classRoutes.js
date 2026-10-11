import express from 'express';
import { createClass, getClasses, getClassById, updateClass, deleteClass, cloneClass } from '../controllers/classController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', requireRole('DEPARTMENT_ADMIN'), createClass);
router.get('/', requireRole('DEPARTMENT_ADMIN', 'EXAM_STAFF', 'SUPER_ADMIN'), getClasses);
router.get('/:id', requireRole('DEPARTMENT_ADMIN', 'EXAM_STAFF', 'SUPER_ADMIN'), getClassById);
router.put('/:id', requireRole('DEPARTMENT_ADMIN'), updateClass);
router.delete('/:id', requireRole('DEPARTMENT_ADMIN'), deleteClass);
router.post('/:id/clone', requireRole('DEPARTMENT_ADMIN'), cloneClass);

export default router;
