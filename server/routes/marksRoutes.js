import express from 'express';
import { 
  getTeacherAllocatedSubjects, 
  getMarksGrid, 
  saveMarks, 
  getStudentMarks 
} from '../controllers/marksController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Teacher marks entry routes
router.get('/teacher-subjects', requireRole('TEACHER'), getTeacherAllocatedSubjects);
router.get('/grid', requireRole('TEACHER', 'DEPARTMENT_ADMIN'), getMarksGrid);
router.post('/save', requireRole('TEACHER', 'DEPARTMENT_ADMIN'), saveMarks);

// Student & Parent marks inspection routes
router.get('/my-marks', requireRole('STUDENT', 'PARENT'), getStudentMarks);

export default router;
