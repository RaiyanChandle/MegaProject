import express from 'express';
import { getSuperAdminStats } from '../controllers/dashboardController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/superadmin', requireRole('SUPER_ADMIN'), getSuperAdminStats);

export default router;
