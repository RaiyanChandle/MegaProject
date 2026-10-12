import express from 'express';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { uploadNoteMiddleware } from '../middlewares/uploadMiddleware.js';
import * as noteController from '../controllers/noteController.js';

const router = express.Router();

router.use(requireAuth);

// Teacher/Admin note creation with file upload to Cloudinary (T8.2)
router.post(
  '/',
  requireRole('TEACHER', 'DEPARTMENT_ADMIN'),
  uploadNoteMiddleware,
  noteController.createNote
);

// Teacher/Admin view notes
router.get(
  '/',
  requireRole('TEACHER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'),
  noteController.getNotes
);

// Enrolled student view notes (T8.2: strictly scoped to student's enrollments)
router.get(
  '/my-notes',
  requireRole('STUDENT'),
  noteController.getStudentNotes
);

// Parent/Teacher view notes for specific student
router.get(
  '/student/:studentId',
  requireRole('PARENT', 'TEACHER', 'DEPARTMENT_ADMIN'),
  noteController.getStudentNotesById
);

// Delete note
router.delete(
  '/:id',
  requireRole('TEACHER', 'DEPARTMENT_ADMIN'),
  noteController.deleteNote
);

export default router;
