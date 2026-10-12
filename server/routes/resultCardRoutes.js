import express from 'express';
import { 
  processResults, 
  getCohortResults, 
  getStudentResultCard, 
  getMyResultCard 
} from '../controllers/resultCardController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// 1. Process ResultCards (Batch or Single Student)
router.post('/process', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), processResults);

// 2. Cohort Result Analytics and Cards
router.get('/cohort', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getCohortResults);

// 3. Student/Parent view of their own ResultCard
router.get('/my-card', requireRole('STUDENT', 'PARENT'), getMyResultCard);

// 4. View specific student's ResultCard details
router.get('/student/:studentId', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'), getStudentResultCard);

export default router;
