import express from 'express';
import { createClass, getClasses, getClassById, updateClass, deleteClass, cloneClass } from '../controllers/classController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN', 'EXAM_STAFF', 'TEACHER'), getClasses);
router.get('/:id', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN', 'EXAM_STAFF', 'TEACHER'), getClassById);

router.post('/', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), createClass);
router.put('/:id', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), updateClass);
router.delete('/:id', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), deleteClass);
router.post('/:id/clone', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), cloneClass);

export default router;
