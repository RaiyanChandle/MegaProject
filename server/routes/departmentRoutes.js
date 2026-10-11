import express from 'express';
import { createDepartment, getDepartments, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', requireRole('SUPER_ADMIN'), createDepartment);
router.get('/', requireRole('SUPER_ADMIN', 'EXAM_STAFF', 'DEPARTMENT_ADMIN'), getDepartments);
router.put('/:id', requireRole('SUPER_ADMIN'), updateDepartment);
router.delete('/:id', requireRole('SUPER_ADMIN'), deleteDepartment);

export default router;
