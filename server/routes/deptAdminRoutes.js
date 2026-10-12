import express from 'express';
import { 
  createDeptAdmin, 
  getDeptAdmins, 
  getDeptAdminById,
  updateDeptAdmin,
  deactivateDeptAdmin,
  deleteDeptAdmin
} from '../controllers/deptAdminController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN'));

router.post('/', createDeptAdmin);
router.get('/', getDeptAdmins);
router.get('/:id', getDeptAdminById);
router.put('/:id', updateDeptAdmin);
router.patch('/:id/status', deactivateDeptAdmin);
router.delete('/:id', deleteDeptAdmin);

export default router;
