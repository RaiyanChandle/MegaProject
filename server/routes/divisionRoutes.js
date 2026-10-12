import express from 'express';
import { createDivision, getDivisions, updateDivision, deleteDivision, assignStudentsToDivision, getDivisionStudents } from '../controllers/divisionController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('DEPARTMENT_ADMIN'));

router.post('/', createDivision);
router.get('/', getDivisions); // Uses ?classId=...
router.put('/:id', updateDivision);
router.delete('/:id', deleteDivision);
router.post('/:id/assign-students', assignStudentsToDivision);
router.get('/:id/students', getDivisionStudents);

export default router;
