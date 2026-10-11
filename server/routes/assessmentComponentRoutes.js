import express from 'express';
import { createComponent, getComponents, updateComponent, deleteComponent } from '../controllers/assessmentComponentController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', requireRole('DEPARTMENT_ADMIN'), createComponent);
router.get('/', requireRole('DEPARTMENT_ADMIN', 'EXAM_STAFF', 'SUPER_ADMIN', 'TEACHER'), getComponents); // Uses ?subjectId=...
router.put('/:id', requireRole('DEPARTMENT_ADMIN'), updateComponent);
router.delete('/:id', requireRole('DEPARTMENT_ADMIN'), deleteComponent);

export default router;
