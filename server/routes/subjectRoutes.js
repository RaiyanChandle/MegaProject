import express from 'express';
import { createSubject, getSubjects, updateSubject, deleteSubject, getSubjectById } from '../controllers/subjectController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('DEPARTMENT_ADMIN'));

router.post('/', createSubject);
router.get('/', getSubjects); // Uses ?classId=...
router.get('/:id', getSubjectById);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

export default router;
