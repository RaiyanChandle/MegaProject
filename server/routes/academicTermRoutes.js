import express from 'express';
import { createTerm, getTerms, setCurrentTerm, updateTerm } from '../controllers/academicTermController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN'));

router.post('/', createTerm);
router.get('/', getTerms);
router.put('/:id', updateTerm);
router.patch('/:id/current', setCurrentTerm);

export default router;
