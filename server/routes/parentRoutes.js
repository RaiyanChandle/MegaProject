import express from 'express';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import * as parentController from '../controllers/parentController.js';

const router = express.Router();

router.use(requireAuth);

// Department Admins can manage parents
router.post('/', requireRole('DEPARTMENT_ADMIN'), parentController.createParent);
router.get('/student/:studentId', requireRole('DEPARTMENT_ADMIN', 'TEACHER', 'STUDENT'), parentController.getStudentParents);
router.delete('/student/:studentId/parent/:parentId', requireRole('DEPARTMENT_ADMIN'), parentController.unlinkParent);

export default router;
