import express from 'express';
import { login, changePassword, getMe } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);
router.put('/password', requireAuth, changePassword);

export default router;
