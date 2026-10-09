import express from 'express';
import { createStudent, getStudents, bulkImportStudents, getStudentEnrollments } from '../controllers/studentController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('DEPARTMENT_ADMIN'));

router.post('/', createStudent);
router.get('/', getStudents);
router.post('/bulk', bulkImportStudents);
router.get('/:id/enrollments', getStudentEnrollments);

export default router;
