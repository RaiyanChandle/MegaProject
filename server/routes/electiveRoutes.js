import express from 'express';
import { 
  createSlot, 
  getSlots, 
  updateSlot, 
  deleteSlot, 
  addOption, 
  removeOption,
  getStudentElectiveSlots 
} from '../controllers/electiveController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// Student & Parent routes (T9.2)
router.get('/my-slots', requireRole('STUDENT', 'PARENT'), getStudentElectiveSlots);

// Department Admin routes
router.post('/slots', requireRole('DEPARTMENT_ADMIN'), createSlot);
router.get('/slots', requireRole('DEPARTMENT_ADMIN'), getSlots); // ?classId=...
router.put('/slots/:id', requireRole('DEPARTMENT_ADMIN'), updateSlot);
router.delete('/slots/:id', requireRole('DEPARTMENT_ADMIN'), deleteSlot);

// Options (Admin)
router.post('/options', requireRole('DEPARTMENT_ADMIN'), addOption);
router.delete('/options/:id', requireRole('DEPARTMENT_ADMIN'), removeOption);

export default router;
