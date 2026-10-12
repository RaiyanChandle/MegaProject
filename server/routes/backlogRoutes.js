import express from 'express';
import { 
  getFailedEnrollments, 
  createReattemptEnrollments, 
  getStudentBacklogs,
  checkBacklogAllocations
} from '../controllers/backlogController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Candidate listing & bulk re-attempt enrollment creation (Task 12.2)
router.get('/failed-enrollments', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), getFailedEnrollments);
router.post('/create-reattempts', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), createReattemptEnrollments);

// T12.3: Allocation check: warn when a re-attempt subject has no teacher allocated
router.get('/allocation-check', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'), checkBacklogAllocations);

// Student backlogs detail view
router.get('/student/:studentId', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'), getStudentBacklogs);

export default router;
