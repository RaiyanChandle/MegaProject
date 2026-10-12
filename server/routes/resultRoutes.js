import express from 'express';
import {
  getMyResultCard,
  getStudentResultCard,
  generateResultCards,
  getClassesForResultGeneration,
  getClassResults
} from '../controllers/resultController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Student / Parent
router.get('/my-result', requireRole('STUDENT', 'PARENT'), getMyResultCard);
router.get('/student/:studentId', requireRole('STUDENT', 'PARENT', 'EXAM_STAFF'), getStudentResultCard);

// Exam Staff
router.get('/classes', requireRole('EXAM_STAFF'), getClassesForResultGeneration);
router.get('/class-students', requireRole('EXAM_STAFF'), getClassResults);
router.post('/generate', requireRole('EXAM_STAFF'), generateResultCards);

export default router;
