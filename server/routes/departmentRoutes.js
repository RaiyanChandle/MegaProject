import express from 'express';
import { createDepartment, getDepartments, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Only SUPER_ADMIN can manage departments
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN'));

router.post('/', createDepartment);
router.get('/', getDepartments);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

export default router;
