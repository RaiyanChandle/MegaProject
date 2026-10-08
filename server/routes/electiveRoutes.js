import express from 'express';
import { createSlot, getSlots, updateSlot, deleteSlot, addOption, removeOption } from '../controllers/electiveController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('DEPARTMENT_ADMIN'));

// Slots
router.post('/slots', createSlot);
router.get('/slots', getSlots); // ?classId=...
router.put('/slots/:id', updateSlot);
router.delete('/slots/:id', deleteSlot);

// Options
router.post('/options', addOption);
router.delete('/options/:id', removeOption);

export default router;
