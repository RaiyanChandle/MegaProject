import express from 'express';
import { createStudent, getStudents, bulkImportStudents, getStudentEnrollments, getMyEnrolledSubjects } from '../controllers/studentController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Student & Parent accessible route for enrolled subjects
router.get('/my-subjects', requireRole('STUDENT', 'PARENT'), getMyEnrolledSubjects);

// Department Admin only management routes
router.use(requireRole('DEPARTMENT_ADMIN'));

router.post('/', createStudent);
router.get('/', getStudents);
router.post('/bulk', bulkImportStudents);
router.get('/:id/enrollments', getStudentEnrollments);

export default router;
