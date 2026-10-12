import express from 'express';
import { 
  getTeacherExams, 
  getExamMarksheet, 
  saveExamMarks, 
  getExamStaffSubmissions, 
  verifyExamResults, 
  rejectExamResults 
} from '../controllers/examResultController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// 1. Teacher: Fetch allocated scheduled exams for evaluation
router.get(
  '/teacher/exams', 
  requireRole('TEACHER'), 
  getTeacherExams
);

// 2. Marksheet Roster for an exam (Teacher, Exam Staff, Super Admin)
router.get(
  '/marksheet/:examId', 
  requireRole('TEACHER', 'EXAM_STAFF', 'SUPER_ADMIN'), 
  getExamMarksheet
);

// 3. Teacher: Bulk save/submit marks for an exam
router.post(
  '/marksheet/:examId/save', 
  requireRole('TEACHER'), 
  saveExamMarks
);

// 4. Exam Staff: Fetch all exam submissions for verification desk
router.get(
  '/exam-staff/submissions', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN'), 
  getExamStaffSubmissions
);

// 5. Exam Staff: Formally verify and publish exam results
router.post(
  '/verify/:examId', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN'), 
  verifyExamResults
);

// 6. Exam Staff: Reject submitted marksheet with remarks
router.post(
  '/reject/:examId', 
  requireRole('EXAM_STAFF', 'SUPER_ADMIN'), 
  rejectExamResults
);

export default router;
