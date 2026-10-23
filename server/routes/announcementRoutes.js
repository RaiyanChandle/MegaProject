import express from 'express';
import { 
  createAnnouncement, 
  getAnnouncements, 
  getAnnouncementById, 
  deleteAnnouncement 
} from '../controllers/announcementController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Create announcement (Super Admin, Dept Admin, Teacher)
router.post(
  '/', 
  requireAuth, 
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'), 
  createAnnouncement
);

// Get announcements
router.get('/', requireAuth, getAnnouncements);

// Get single announcement
router.get('/:id', requireAuth, getAnnouncementById);

// Delete announcement
router.delete(
  '/:id', 
  requireAuth, 
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'TEACHER'), 
  deleteAnnouncement
);

export default router;
