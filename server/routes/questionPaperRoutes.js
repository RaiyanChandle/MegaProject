import express from 'express';
import { 
  createQuestionPaper, 
  getQuestionPapers, 
  getQuestionPaperById, 
  updateQuestionPaperStatus, 
  updateQuestionPaper, 
  deleteQuestionPaper 
} from '../controllers/questionPaperController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { createUploadMiddleware } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.use(requireAuth);

const qpUpload = createUploadMiddleware({
  fieldName: 'file',
  folder: 'nexus/question-papers',
  maxSize: 20 * 1024 * 1024, // 20MB
  isOptional: true // Allows uploading via file or providing fileUrl
});

// View question papers
router.get('/', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'), getQuestionPapers);
router.get('/:id', requireRole('EXAM_STAFF', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'), getQuestionPaperById);

// Create / upload question paper
router.post('/', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), qpUpload, createQuestionPaper);

// Update status workflow (DRAFT -> SUBMITTED -> APPROVED)
router.patch('/:id/status', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), updateQuestionPaperStatus);

// Update document file / content
router.put('/:id', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), qpUpload, updateQuestionPaper);

// Delete draft question paper
router.delete('/:id', requireRole('EXAM_STAFF', 'SUPER_ADMIN'), deleteQuestionPaper);

export default router;
