import express from 'express';
import { createSubject, getSubjects, updateSubject, deleteSubject, getSubjectById, getGlobalElectives, getSubjectStudents } from '../controllers/subjectController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', requireRole('DEPARTMENT_ADMIN'), createSubject);
router.get('/global-electives', requireRole('DEPARTMENT_ADMIN', 'EXAM_STAFF', 'SUPER_ADMIN'), getGlobalElectives);
router.get('/', requireRole('DEPARTMENT_ADMIN', 'EXAM_STAFF', 'SUPER_ADMIN'), getSubjects); // Uses ?classId=...
router.get('/:id', requireRole('DEPARTMENT_ADMIN', 'EXAM_STAFF', 'SUPER_ADMIN'), getSubjectById);
router.get('/:id/students', requireRole('DEPARTMENT_ADMIN'), getSubjectStudents);
router.put('/:id', requireRole('DEPARTMENT_ADMIN'), updateSubject);
router.delete('/:id', requireRole('DEPARTMENT_ADMIN'), deleteSubject);

export default router;
