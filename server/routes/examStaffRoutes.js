import express from 'express';
import { createExamStaff, getExamStaff } from '../controllers/examStaffController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN'));

router.post('/', createExamStaff);
router.get('/', getExamStaff);

export default router;
