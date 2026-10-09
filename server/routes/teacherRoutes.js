import express from 'express';
import { createTeacher, getTeachers, bulkImportTeachers } from '../controllers/teacherController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('DEPARTMENT_ADMIN'));

router.post('/', createTeacher);
router.get('/', getTeachers);
router.post('/bulk', bulkImportTeachers);

export default router;
