import express from 'express';
import { 
  getQuestionPapers, 
  getQuestionPapersByExam, 
  getTeacherAssignedExams,
  createQuestionPaper, 
  updateQuestionPaperStatus, 
  deleteQuestionPaper 
} from '../controllers/questionPaperController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { createUploadMiddleware } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Get exams assigned to the logged-in faculty/teacher for question paper upload
router.get(
  '/my-assigned-exams',
  requireRole('TEACHER', 'SUPER_ADMIN'),
  getTeacherAssignedExams
);

// List all question papers
router.get(
  '/', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'), 
  getQuestionPapers
);

// Get papers for a specific exam
router.get(
  '/exam/:examId', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'), 
  getQuestionPapersByExam
);

// Upload/Create question paper (with optional file upload via Cloudinary or fileUrl)
router.post(
  '/', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'TEACHER'),
  createUploadMiddleware({
    fieldName: 'file',
    folder: 'nexus/question_papers',
    maxSize: 15 * 1024 * 1024,
    isOptional: true
  }),
  createQuestionPaper
);

// Transition workflow: DRAFT -> SUBMITTED -> APPROVED
router.patch(
  '/:id/status', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'TEACHER'), 
  updateQuestionPaperStatus
);

router.put(
  '/:id', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'TEACHER'), 
  updateQuestionPaperStatus
);

// Delete paper
router.delete(
  '/:id', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN'), 
  deleteQuestionPaper
);

export default router;
