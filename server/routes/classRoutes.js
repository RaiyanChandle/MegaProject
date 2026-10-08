import express from 'express';
import { createClass, getClasses, getClassById, updateClass, deleteClass, cloneClass } from '../controllers/classController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('DEPARTMENT_ADMIN'));

router.post('/', createClass);
router.get('/', getClasses);
router.get('/:id', getClassById);
router.put('/:id', updateClass);
router.delete('/:id', deleteClass);
router.post('/:id/clone', cloneClass);

export default router;
