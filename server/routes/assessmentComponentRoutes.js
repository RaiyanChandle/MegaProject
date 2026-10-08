import express from 'express';
import { createComponent, getComponents, updateComponent, deleteComponent } from '../controllers/assessmentComponentController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('DEPARTMENT_ADMIN'));

router.post('/', createComponent);
router.get('/', getComponents); // Uses ?subjectId=...
router.put('/:id', updateComponent);
router.delete('/:id', deleteComponent);

export default router;
