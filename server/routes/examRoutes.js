import express from 'express';
import { 
  getExamFormOptions, 
  getExams, 
  getExamById, 
  createExam, 
  updateExam, 
  deleteExam 
} from '../controllers/examController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Metadata options for schedule modal (terms, classes, subjects, components)
router.get(
  '/form-options', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'), 
  getExamFormOptions
);

// List exams with filters
router.get(
  '/', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'STUDENT'), 
  getExams
);

// Get single exam details
router.get(
  '/:id', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'), 
  getExamById
);

// Create, update, delete scheduled exams (Exam Staff & Super Admin)
router.post(
  '/', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN'), 
  createExam
);

router.put(
  '/:id', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN'), 
  updateExam
);

router.delete(
  '/:id', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN'), 
  deleteExam
);

export default router;
