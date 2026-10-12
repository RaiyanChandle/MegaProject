import express from 'express';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import * as attendanceController from '../controllers/attendanceController.js';

const router = express.Router();

// All attendance routes require authentication
router.use(requireAuth);

// Session endpoints
router.post(
  '/sessions', 
  requireRole('TEACHER', 'DEPARTMENT_ADMIN'), 
  attendanceController.createSession
);

router.get(
  '/sessions', 
  requireRole('TEACHER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'), 
  attendanceController.getSessions
);

router.get(
  '/sessions/:id', 
  requireRole('TEACHER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'), 
  attendanceController.getSessionById
);

// Roster endpoint (T7.2)
router.get(
  '/roster', 
  requireRole('TEACHER', 'DEPARTMENT_ADMIN'), 
  attendanceController.getRoster
);

// Attendance records submission (T7.3, T7.4)
router.post(
  '/sessions/:id/records', 
  requireRole('TEACHER', 'DEPARTMENT_ADMIN'), 
  attendanceController.markAttendance
);

// Student & Parent attendance views (T7.5, T7.6)
router.get(
  '/student/:studentId', 
  requireRole('STUDENT', 'PARENT', 'TEACHER', 'DEPARTMENT_ADMIN'), 
  attendanceController.getStudentSummary
);

router.get(
  '/my-summary', 
  requireRole('STUDENT'), 
  attendanceController.getStudentSummary
);

router.get(
  '/parent-view', 
  requireRole('PARENT'), 
  attendanceController.getStudentSummary
);

// Reports (T7.7)
router.get(
  '/report', 
  requireRole('TEACHER', 'DEPARTMENT_ADMIN'), 
  attendanceController.getAttendanceReport
);

export default router;
