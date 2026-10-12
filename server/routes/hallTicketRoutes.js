import express from 'express';
import { 
  generateHallTickets, 
  getHallTickets, 
  getHallTicketById, 
  getStudentAdmitCard,
  getStudentTicketTypes,
  getPreviewExams,
  updateHallTicket, 
  deleteHallTicket 
} from '../controllers/hallTicketController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Read hall tickets (Exam Staff, Admins, Teachers, Students, Parents)
router.get('/', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'), getHallTickets);
router.get('/preview-exams', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), getPreviewExams);
router.get('/student/:studentId/types', getStudentTicketTypes);
router.get('/student/:studentId', getStudentAdmitCard);
router.get('/:id', getHallTicketById);

// Generate Hall Tickets in batch per enrollment (Rule 18 / Flow 11)
router.post('/generate', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), generateHallTickets);

// Update seat number or exam center
router.put('/:id', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), updateHallTicket);

// Revoke / delete hall ticket
router.delete('/:id', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), deleteHallTicket);

export default router;
