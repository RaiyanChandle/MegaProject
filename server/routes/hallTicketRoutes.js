import express from 'express';
import { 
  generateHallTickets, 
  getHallTickets, 
  getMyHallTickets, 
  deleteHallTicket, 
  bulkDeleteHallTickets 
} from '../controllers/hallTicketController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Student & Parent: Get official grouped hall tickets (Separate for MSE, ESE, and Backlogs)
router.get(
  '/my-tickets',
  requireRole('STUDENT', 'PARENT', 'EXAM_STAFF', 'SUPER_ADMIN'),
  getMyHallTickets
);

// Exam Staff & Admins: List all hall tickets with filtering
router.get(
  '/',
  requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
  getHallTickets
);

// Exam Staff: Bulk generate hall tickets for MSE (Midterm) or ESE (Final)
router.post(
  '/generate',
  requireRole('EXAM_STAFF', 'SUPER_ADMIN'),
  generateHallTickets
);

// Exam Staff: Bulk revoke hall tickets
router.post(
  '/bulk-delete',
  requireRole('EXAM_STAFF', 'SUPER_ADMIN'),
  bulkDeleteHallTickets
);

// Exam Staff: Delete single hall ticket
router.delete(
  '/:id',
  requireRole('EXAM_STAFF', 'SUPER_ADMIN'),
  deleteHallTicket
);

export default router;
