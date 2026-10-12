import express from 'express';
import { 
  getFailedEnrollments, 
  createReattemptEnrollments, 
  getStudentBacklogs 
} from '../controllers/backlogController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Candidate listing & bulk re-attempt enrollment creation (Task 12.2)
router.get('/failed-enrollments', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getFailedEnrollments);
router.post('/create-reattempts', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), createReattemptEnrollments);

// Student backlogs detail view
router.get('/student/:studentId', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'), getStudentBacklogs);

export default router;
