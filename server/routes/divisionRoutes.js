import express from 'express';
import { createDivision, getDivisions, updateDivision, deleteDivision, assignStudentsToDivision, getDivisionStudents } from '../controllers/divisionController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'EXAM_STAFF', 'STUDENT'), getDivisions); // Uses ?classId=...
router.get('/:id/students', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN', 'TEACHER'), getDivisionStudents);

router.post('/', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), createDivision);
router.put('/:id', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), updateDivision);
router.delete('/:id', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), deleteDivision);
router.post('/:id/assign-students', requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), assignStudentsToDivision);

export default router;
