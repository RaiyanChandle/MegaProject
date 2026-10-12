import express from 'express';
import { createTerm, getTerms, setCurrentTerm, updateTerm } from '../controllers/academicTermController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getTerms);
router.post('/', requireRole('SUPER_ADMIN'), createTerm);
router.put('/:id', requireRole('SUPER_ADMIN'), updateTerm);
router.patch('/:id/current', requireRole('SUPER_ADMIN'), setCurrentTerm);

export default router;
