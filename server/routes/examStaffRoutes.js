import express from 'express';
import { 
  createExamStaff, 
  getExamStaff, 
  getExamStaffById, 
  updateExamStaff, 
  deleteExamStaff 
} from '../controllers/examStaffController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN'));

router.post('/', createExamStaff);
router.get('/', getExamStaff);
router.get('/:id', getExamStaffById);
router.put('/:id', updateExamStaff);
router.delete('/:id', deleteExamStaff);

export default router;
