import express from 'express';
import { allocateTeacher, getSubjectAllocations, deleteAllocation } from '../controllers/subjectAllocationController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('DEPARTMENT_ADMIN'));

router.post('/', allocateTeacher);
router.get('/', getSubjectAllocations);
router.delete('/:id', deleteAllocation);

export default router;
