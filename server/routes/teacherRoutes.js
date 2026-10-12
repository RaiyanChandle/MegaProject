import express from 'express';
import { createTeacher, getTeachers, bulkImportTeachers, getMyAllocations } from '../controllers/teacherController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Teacher routes
router.get('/my-allocations', requireRole('TEACHER', 'DEPARTMENT_ADMIN'), getMyAllocations);

// Dept Admin routes
router.post('/', requireRole('DEPARTMENT_ADMIN'), createTeacher);
router.get('/', requireRole('DEPARTMENT_ADMIN'), getTeachers);
router.post('/bulk', requireRole('DEPARTMENT_ADMIN'), bulkImportTeachers);

export default router;
