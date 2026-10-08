import express from 'express';
import { login, changePassword } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/change-password', requireAuth, changePassword);

export default router;
