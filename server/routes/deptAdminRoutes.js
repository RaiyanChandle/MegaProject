import express from 'express';
import { createDeptAdmin, getDeptAdmins, deactivateDeptAdmin } from '../controllers/deptAdminController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN'));

router.post('/', createDeptAdmin);
router.get('/', getDeptAdmins);
router.patch('/:id/status', deactivateDeptAdmin);

export default router;
