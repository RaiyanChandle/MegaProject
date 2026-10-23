import express from 'express';
import { getSuperAdminStats, getDeptAdminStats, getIdRegistryUsers } from '../controllers/dashboardController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/superadmin', requireRole('SUPER_ADMIN'), getSuperAdminStats);
router.get('/deptadmin', requireRole('DEPARTMENT_ADMIN'), getDeptAdminStats);
router.get('/id-registry/:prefix', requireRole('SUPER_ADMIN'), getIdRegistryUsers);

export default router;
