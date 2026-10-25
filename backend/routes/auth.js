const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authMiddleware');
const upload = require('../utils/upload');
const { authLimiter, resendOtpLimiter } = require('../middlewares/rateLimiter');

// --- Public Routes (Có Rate Limiter bảo vệ chống Brute-Force & Spam) ---
router.post('/register', authLimiter, (req, res) => authController.register(req, res));
router.post('/verify-otp', authLimiter, (req, res) => authController.verifyOtp(req, res));
router.post('/resend-otp', resendOtpLimiter, (req, res) => authController.resendOtp(req, res));
router.post('/login', authLimiter, (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/profile/:id', (req, res) => authController.getProfile(req, res));

// --- Protected Routes (Bắt buộc token xác thực, chống IDOR) ---
router.put('/profile', authenticate, (req, res) => authController.updateProfile(req, res));
router.post('/update-avatar', authenticate, upload.single('avatar'), (req, res) => authController.updateAvatar(req, res));

module.exports = router;
