import express from 'express';
import { 
  createExam, 
  getExams, 
  getExamById, 
  updateExam, 
  deleteExam 
} from '../controllers/examController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Read exams is accessible by Exam Staff, Super Admin, Dept Admin, Teacher, Student
router.get('/', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'STUDENT'), getExams);
router.get('/:id', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'STUDENT'), getExamById);

// Schedule, update, delete exams is restricted to Exam Staff and Super Admin
router.post('/', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), createExam);
router.put('/:id', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), updateExam);
router.delete('/:id', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), deleteExam);

export default router;
