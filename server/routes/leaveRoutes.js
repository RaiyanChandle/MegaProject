import express from 'express';
import {
  createLeaveRequest,
  getMyLeaveRequests,
  cancelLeaveRequest,
  getDepartmentLeaveRequests,
  resolveLeaveRequest,
  getPendingLeaveCount
} from '../controllers/leaveController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Pending count for sidebar notification badge
router.get(
  '/pending-count',
  requireAuth,
  getPendingLeaveCount
);

// Requester endpoints (Student & Teacher)
router.post(
  '/', 
  requireAuth, 
  requireRole('STUDENT', 'TEACHER'), 
  createLeaveRequest
);

router.get(
  '/my-requests', 
  requireAuth, 
  requireRole('STUDENT', 'TEACHER'), 
  getMyLeaveRequests
);

router.delete(
  '/:id', 
  requireAuth, 
  requireRole('STUDENT', 'TEACHER'), 
  cancelLeaveRequest
);

// Reviewer endpoints (Department Admin & Super Admin)
router.get(
  '/department', 
  requireAuth, 
  requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), 
  getDepartmentLeaveRequests
);

router.patch(
  '/:id/status', 
  requireAuth, 
  requireRole('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), 
  resolveLeaveRequest
);

export default router;
