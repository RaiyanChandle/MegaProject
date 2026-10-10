import express from 'express';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { uploadAssignmentMiddleware, uploadSubmissionMiddleware } from '../middlewares/uploadMiddleware.js';
import * as assignmentController from '../controllers/assignmentController.js';

const router = express.Router();

router.use(requireAuth);

// Teacher/Admin assignment creation (T8.4)
router.post(
  '/',
  requireRole('TEACHER', 'DEPARTMENT_ADMIN'),
  uploadAssignmentMiddleware,
  assignmentController.createAssignment
);

// Teacher/Admin list assignments (T8.4)
router.get(
  '/',
  requireRole('TEACHER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'),
  assignmentController.getAssignments
);

// Student list assignments for enrolled subjects (T8.4)
router.get(
  '/my-assignments',
  requireRole('STUDENT'),
  assignmentController.getStudentAssignments
);

// Teacher/Admin view assignment details and student submissions (T8.4)
router.get(
  '/:id',
  requireRole('TEACHER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'),
  assignmentController.getAssignmentById
);

// Student submit assignment before deadline (T8.4)
router.post(
  '/:id/submit',
  requireRole('STUDENT'),
  uploadSubmissionMiddleware,
  assignmentController.submitAssignment
);

// Teacher/Admin delete assignment (T8.4)
router.delete(
  '/:id',
  requireRole('TEACHER', 'DEPARTMENT_ADMIN'),
  assignmentController.deleteAssignment
);

export default router;
